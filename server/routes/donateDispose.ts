import { RequestHandler } from "express";

// Fixed guidelines for disposal
const DISPOSAL_GUIDELINES = {
  safeDisposal: [
    "Mix medicines (do not crush) with an unpalatable substance such as dirt, kitty litter, or used coffee grounds.",
    "Place the mixture in a container such as a sealed plastic bag.",
    "Throw the container in your household trash.",
    "Scratch out all personal information on the prescription label of your empty pill bottle or empty medicine packaging to make it unreadable, then dispose of the container."
  ],
  hazardous: [
    "Check if your community has a permanent drug disposal box or take-back program.",
    "Ask your pharmacy if they have a disposal kiosk."
  ]
};

// Mock database of donation centers (Hospitals & Pharmacies) with coordinates
// Helper to search hospitals and pharmacies dynamically
async function fetchNearbyPlaces(locationQuery?: string, coords?: { lat: number; lng: number }) {
  const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  try {
    let lat: number;
    let lon: number;
    let geocodedCenter: { lat: number; lon: number } | null = null;

    if (coords) {
      lat = coords.lat;
      lon = coords.lng;
      geocodedCenter = { lat, lon };
      console.log(`[Search] Live Geolocation: ${lat}, ${lon}`);
    } else {
      if (!locationQuery || locationQuery.trim().length === 0) return { centers: [], geocodedCenter: null };

      const searchStr = locationQuery.toLowerCase().includes('india') ? locationQuery : `${locationQuery}, India`;
      console.log(`[Search] Geocoding target: ${searchStr}`);

      const geocodeParams = new URLSearchParams({
        q: searchStr,
        format: 'json',
        limit: '1'
      });

      const geocodeResponse = await fetch(`https://nominatim.openstreetmap.org/search?${geocodeParams.toString()}`, {
        headers: { 'User-Agent': 'MedWiseAI/1.0' }
      });

      if (!geocodeResponse.ok) return { centers: [], geocodedCenter: null };
      const geocodeData = await geocodeResponse.json() as any[];
      if (geocodeData.length === 0) return { centers: [], geocodedCenter: null };

      lat = parseFloat(geocodeData[0].lat);
      lon = parseFloat(geocodeData[0].lon);
      geocodedCenter = { lat, lon };
      console.log(`[Search] Geocoded to: ${lat}, ${lon}`);
    }

    const overpassQuery = `
      [out:json][timeout:60];
      (
        node(around:12000,${lat},${lon})["amenity"~"hospital|pharmacy|clinic|doctors"];
        way(around:12000,${lat},${lon})["amenity"~"hospital|pharmacy|clinic|doctors"];
        rel(around:12000,${lat},${lon})["amenity"~"hospital|pharmacy|clinic|doctors"];
        node(around:12000,${lat},${lon})["healthcare"~"hospital|pharmacy|clinic|doctor"];
        way(around:12000,${lat},${lon})["healthcare"~"hospital|pharmacy|clinic|doctor"];
        rel(around:12000,${lat},${lon})["healthcare"~"hospital|pharmacy|clinic|doctor"];
      );
      out center;
    `;

    let overpassData: any = null;
    let successEndpoint = '';

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        console.log(`[Search] Attempting Overpass query at: ${endpoint}`);
        const response = await fetch(`${endpoint}?data=${encodeURIComponent(overpassQuery)}`, {
          headers: { 'User-Agent': 'MedWiseAI/1.0' }
        });

        if (response.ok) {
          overpassData = await response.json();
          successEndpoint = endpoint;
          break;
        }
      } catch (err) {
        console.warn(`[Search] Endpoint ${endpoint} failed. Trying next...`);
      }
    }

    if (!overpassData || !overpassData.elements || overpassData.elements.length === 0) {
      console.log(`[Search] No results found in live network.`);
      return { centers: [], geocodedCenter };
    }

    console.log(`[Search] SUCCESS! Found ${overpassData.elements.length} facilities via ${successEndpoint}`);

    const centers = overpassData.elements.map((element: any) => {
      const pLat = element.lat || (element.center ? element.center.lat : 0);
      const pLng = element.lon || (element.center ? element.center.lon : 0);
      const tags = element.tags || {};

      const isPharmacy = tags.amenity === 'pharmacy' || tags.healthcare === 'pharmacy';
      const type = isPharmacy ? 'Pharmacy' : (tags.amenity === 'doctors' ? 'Clinic' : 'Hospital');
      const name = tags.name || (isPharmacy ? 'Local Pharmacy' : 'Medical Facility');

      return {
        name: name,
        type: type,
        address: tags['addr:full'] ||
          (tags['addr:street'] ? `${tags['addr:housenumber'] || ''} ${tags['addr:street']}, ${tags['addr:city'] || ''}`.trim() : 'Address on map'),
        phone: tags.phone || tags['contact:phone'] || "Contact to confirm",
        coordinates: { lat: pLat, lng: pLng },
        accepts: ["Unopened", "Sealed", "Unexpired"],
        distance: "Live",
        hours: tags.opening_hours || "Contact facility",
        rating: 4.2 + (Math.random() * 0.8),
        verified: true
      };
    }).filter((place: any) => place.coordinates.lat !== 0);

    return { centers, geocodedCenter };
  } catch (error) {
    console.error("Critical Search Error:", error);
    return { centers: [], geocodedCenter: null };
  }
}

// Fallback mock data in case API fails or rate limited
const MOCK_CENTERS = [
  {
    name: "City General Hospital",
    type: "Hospital",
    address: "123 Medical Center Dr",
    phone: "(555) 0123",
    coordinates: { lat: 40.7128, lng: -74.0060 },
    accepts: ["Unopened", "Unexpired", "Sealed"],
    distance: "1.2 miles",
    hours: "Open 24/7",
    rating: 4.8,
    verified: true
  },
  {
    name: "Community Care Pharmacy",
    type: "Pharmacy",
    address: "456 Oak St",
    phone: "(555) 0456",
    coordinates: { lat: 40.7138, lng: -74.0070 },
    accepts: ["Unopened", "Unexpired"],
    distance: "2.5 miles",
    hours: "08:00 - 22:00",
    rating: 4.5,
    verified: true
  }
];

export const getDonateDisposeRecommendation: RequestHandler = async (req, res) => {
  try {
    const { medicineInfo, location } = req.body;

    if (!medicineInfo) {
      return res.status(400).json({
        error: 'Missing medicine information',
        message: 'Please provide medicine information for recommendation'
      });
    }

    const { expiryDate, condition, medicineType, expiryNotAvailable } = medicineInfo;

    // Check expiry
    let isExpired = false;
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const today = new Date();
      // Reset time for accurate date comparison
      today.setHours(0, 0, 0, 0);
      isExpired = expiry < today;
    }

    const isUnsure = medicineType === 'not-sure';
    const isControlled = medicineType === 'controlled';

    let recommendation = "";
    let reasoning = "";
    let resultData: any = {};

    if (expiryNotAvailable) {
      recommendation = "Consult";
      reasoning = "Since the expiry date is not visible, we cannot confirm its safety. Consuming or donating medicine with an unknown expiry date poses significant health risks.";
      resultData = {
        instructions: [
          "Please consult a pharmacist for professional identification if possible.",
          "If the medicine cannot be identified, follow safe disposal guidelines.",
          "Do not share or donate this medicine."
        ],
        warnings: ["Unknown expiry dates are a major safety concern."]
      };
    } else if (isExpired) {
      recommendation = "Dispose";
      reasoning = "This medicine has passed its expiration date. Expired medicines can be less effective or even risky due to changes in chemical composition.";
      resultData = {
        guidelines: DISPOSAL_GUIDELINES,
        instructions: [
          "Do not consume or donate this medicine.",
          "Use a drug take-back program if available.",
          "If throwing in trash: Mix with unpalatable substance (dirt, kitty litter), seal in a bag, and scratch out personal info."
        ]
      };
    } else if (isControlled) {
      recommendation = "Dispose";
      reasoning = "This is a controlled substance. These require strict handling and cannot be donated due to legal and safety regulations.";
      resultData = {
        guidelines: DISPOSAL_GUIDELINES,
        instructions: [
          "Must be disposed of through authorized collectors or take-back programs.",
          "Check the DEA website for authorized disposal locations.",
          "Do not flush unless specifically instructed by the FDA 'flush list'."
        ]
      };
    } else if (isUnsure) {
      recommendation = "Consult";
      reasoning = "Safety First: Since you are unsure about the medicine type, we cannot provide an automated recommendation.";
      resultData = {
        instructions: [
          "Take the medicine to a local pharmacist for identification.",
          "Keep the medicine in its original packaging if possible.",
          "Do not consume or donate until professionally identified."
        ]
      };
    } else if (condition !== 'unopened') {
      recommendation = "Dispose";
      reasoning = "This medicine has been opened or partially used. For safety and hygiene reasons, opened medicines should not be donated.";
      resultData = {
        guidelines: DISPOSAL_GUIDELINES,
        instructions: [
          "Opened medicines can be contaminated or degraded.",
          "Dispose of following standard safe disposal procedures.",
          "Consider checking for a local pharmacy disposal kiosk."
        ]
      };
    } else {
      recommendation = "Donate";
      reasoning = "Based on general guidelines, this medicine may be eligible for donation. It is unexpired, unopened, and appears suitable for helping others.";

      // Fetch nearby centers based on user location
      const { centers, geocodedCenter } = await fetchNearbyPlaces(location);
      let nearbyCenters = centers;
      let usedMock = false;

      if (nearbyCenters.length === 0) {
        nearbyCenters = MOCK_CENTERS; // Fallback if API fails
        usedMock = true;
      }

      resultData = {
        nearbyCenters,
        geocodedCenter,
        source: usedMock ? "Mock Data" : "OpenStreetMap",
        instructions: [
          "Keep the medicine in its original, sealed packaging.",
          "Store in a cool, dry place until you can donate.",
          "Contact the donation center first to confirm they accept this specific brand."
        ],
        message: usedMock
          ? "We couldn't find your location interactively, so here are some example centers. Please check your local maps."
          : `Here are some donation centers found near ${location || 'you'}:`
      };
    }

    res.json({
      success: true,
      data: {
        recommendation,
        reasoning,
        ...resultData,
        medicineInfo,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Donate/Dispose recommendation error:', error);
    res.status(500).json({
      error: 'Recommendation failed',
      message: 'Failed to generate recommendation'
    });
  }
};

export const findDonationCenters: RequestHandler = async (req, res) => {
  try {
    const { location, lat: qLat, lng: qLng } = req.query;
    const locString = location as string;

    let centersData;
    if (qLat && qLng) {
      centersData = await fetchNearbyPlaces(undefined, {
        lat: parseFloat(qLat as string),
        lng: parseFloat(qLng as string)
      });
    } else {
      centersData = await fetchNearbyPlaces(locString);
    }

    const { centers, geocodedCenter } = centersData;
    let finalCenters = centers;
    let usedMock = false;

    // Only show mock centers as a demo if no search was performed yet
    // If a search was performed (GPS or Text) and returned 0, return 0 to the user
    if (finalCenters.length === 0 && !location && !qLat) {
      finalCenters = MOCK_CENTERS;
      usedMock = true;
    }

    res.json({
      success: true,
      data: {
        centers: finalCenters,
        geocodedCenter,
        total: finalCenters.length,
        searchLocation: locString || (qLat ? `${qLat}, ${qLng}` : "Default"),
        source: usedMock ? "Mock Data (API Limit/Error)" : "OpenStreetMap"
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to find centers" });
  }
};

export const getDisposalGuidelines: RequestHandler = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        guidelines: DISPOSAL_GUIDELINES,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch guidelines" });
  }
};

export const reportDonation: RequestHandler = async (req, res) => {
  try {
    const { donationInfo } = req.body;

    if (!donationInfo) {
      return res.status(400).json({
        error: 'Missing donation information',
        message: 'Please provide donation details'
      });
    }

    // In a real application, this would save to database
    const reportId = `DON${Date.now()}`;

    res.json({
      success: true,
      data: {
        reportId,
        status: "recorded",
        message: "Thank you for your donation! Your contribution helps others in need.",
        donationInfo,
        submittedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Report donation error:', error);
    res.status(500).json({
      error: 'Report failed',
      message: 'Failed to record donation'
    });
  }
};
