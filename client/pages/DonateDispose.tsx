import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Recycle,
  MapPin,
  Phone,
  Clock,
  Star,
  CheckCircle,
  AlertTriangle,
  Info,
  Shield,
  Package,
  Users,
  Loader2,
  ExternalLink,
  Heart,
  LayoutGrid,
  List as ListIcon,
  Navigation,
  Activity,
  Map as MapIconUI
} from "lucide-react";
import { cn } from "@/lib/utils";
import DonationMap from "@/components/DonationMap";

interface MedicineInfo {
  name: string;
  manufacturer?: string;
  expiryDate: string;
  batchNumber?: string;
  strength?: string;
  condition: 'unopened' | 'opened' | 'partial';
  medicineType: 'prescription' | 'otc' | 'controlled' | 'not-sure';
}

interface Recommendation {
  recommendation: 'keep' | 'donate' | 'dispose' | 'consult';
  reasoning: string;
  instructions: string[];
  resources: string[];
  warnings: string[];
}

interface DonationCenter {
  name: string;
  address: string;
  phone: string;
  distance: string;
  accepts: string[];
  hours: string;
  rating: number;
  verified: boolean;
  coordinates: {
    lat: number;
    lng: number;
  };
  type: string;
}

export default function DonateDispose() {
  const [medicineInfo, setMedicineInfo] = useState<Partial<MedicineInfo>>({
    condition: 'unopened',
    medicineType: 'otc'
  });
  const [expiryNotAvailable, setExpiryNotAvailable] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [donationCenters, setDonationCenters] = useState<DonationCenter[]>([]);
  const [location, setLocation] = useState("");
  const [selectedCenter, setSelectedCenter] = useState<DonationCenter | null>(null);
  const [searchCenter, setSearchCenter] = useState<[number, number] | undefined>(undefined);
  const [searchLoading, setSearchLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [userCoords, setUserCoords] = useState<{ lat: number, lng: number } | null>(null);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setSearchLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setSearchCenter([latitude, longitude]);

        try {
          const response = await fetch(`/api/donate-dispose/donation-centers?lat=${latitude}&lng=${longitude}`);
          const data = await response.json();
          if (data.success) {
            const sortedCenters = data.data.centers
              .sort((a: DonationCenter, b: DonationCenter) => {
                const distA = parseFloat(calculateDistance(latitude, longitude, a.coordinates.lat, a.coordinates.lng));
                const distB = parseFloat(calculateDistance(latitude, longitude, b.coordinates.lat, b.coordinates.lng));
                return distA - distB;
              })
              .filter((c: DonationCenter) =>
                parseFloat(calculateDistance(latitude, longitude, c.coordinates.lat, c.coordinates.lng)) <= 15
              );
            setDonationCenters(sortedCenters);
          }
        } catch (err) {
          console.error("Geolocation search error:", err);
        } finally {
          setSearchLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to retrieve your location. Please enter it manually.");
        setSearchLoading(false);
      }
    );
  };

  const getRecommendation = async () => {
    if (!medicineInfo.name || (!medicineInfo.expiryDate && !expiryNotAvailable)) return;

    setIsLoading(true);

    // Simulate a brief analysis delay for UX
    await new Promise(resolve => setTimeout(resolve, 800));

    let result: Recommendation;

    if (expiryNotAvailable) {
      result = {
        recommendation: 'consult',
        reasoning: "Since the expiry date is not visible, we cannot confirm its safety. Consuming or donating medicine with an unknown expiry date poses significant health risks.",
        instructions: [
          "Please consult a pharmacist for professional identification if possible.",
          "If the medicine cannot be identified, follow safe disposal guidelines.",
          "Do not share or donate this medicine."
        ],
        resources: ["Pharmacist Consultation", "Safe Disposal Guidelines"],
        warnings: ["Unknown expiry dates are a major safety concern."]
      };
    } else {
      const today = new Date();
      const expiry = new Date(medicineInfo.expiryDate!);
      const isExpired = expiry < today;

      if (isExpired) {
        result = {
          recommendation: 'dispose',
          reasoning: "This medicine has passed its expiration date. Expired medicines can be less effective or even risky due to changes in chemical composition.",
          instructions: [
            "Do not consume or donate this medicine.",
            "Use a drug take-back program if available.",
            "If throwing in trash: Mix with unpalatable substance (dirt, kitty litter), seal in a bag, and scratch out personal info."
          ],
          resources: ["FDA Disposal Guidelines", "Local Pharmacy Take-back"],
          warnings: ["Expired medicines should never be shared or donated."]
        };
      } else if (medicineInfo.medicineType === 'controlled') {
        result = {
          recommendation: 'dispose',
          reasoning: "This is a controlled substance. These require strict handling and cannot be donated due to legal and safety regulations.",
          instructions: [
            "Must be disposed of through authorized collectors or take-back programs.",
            "Check the DEA website for authorized disposal locations.",
            "Do not flush unless specifically instructed by the FDA 'flush list'."
          ],
          resources: ["DEA Diversion Control Division", "Pharmacist Consultation"],
          warnings: ["Illegal to share or donate controlled substances."]
        };
      } else if (medicineInfo.medicineType === 'not-sure') {
        result = {
          recommendation: 'consult',
          reasoning: "Safety First: Since you are unsure about the medicine type, we cannot provide an automated recommendation.",
          instructions: [
            "Take the medicine to a local pharmacist for identification.",
            "Keep the medicine in its original packaging if possible.",
            "Do not consume or donate until professionally identified."
          ],
          resources: ["Local Pharmacist", "Healthcare Provider"],
          warnings: ["Identifying unknown medicines yourself can be dangerous."]
        };
      } else if (medicineInfo.condition !== 'unopened') {
        result = {
          recommendation: 'dispose',
          reasoning: "This medicine has been opened or partially used. For safety and hygiene reasons, opened medicines should not be donated.",
          instructions: [
            "Opened medicines can be contaminated or degraded.",
            "Dispose of following standard safe disposal procedures.",
            "Consider checking for a local pharmacy disposal kiosk."
          ],
          resources: ["Safe Disposal Guide"],
          warnings: ["Donating opened medicine is a safety risk to the recipient."]
        }
      } else {
        // Unopened, Not Expired, Not Controlled, Not 'Not Sure'
        result = {
          recommendation: 'donate',
          reasoning: "Based on general guidelines, this medicine may be eligible for donation. It is unexpired, unopened, and appears suitable for helping others.",
          instructions: [
            "Keep the medicine in its original, sealed packaging.",
            "Store in a cool, dry place until you can donate.",
            "Contact the donation center first to confirm they accept this specific brand."
          ],
          resources: ["Medicine Donation Centers", "Local Hospitals"],
          warnings: ["This is a general guideline; final acceptance is at the center's discretion."]
        };
      }
    }

    setRecommendation(result);
    setIsLoading(false);
  };

  const findDonationCenters = async () => {
    if (!location.trim()) return;
    setSearchLoading(true);
    try {
      const response = await fetch(`/api/donate-dispose/donation-centers?location=${encodeURIComponent(location)}`);
      const data = await response.json();

      if (data.success && Array.isArray(data.data.centers)) {
        let finalCenters = data.data.centers;

        if (data.data.geocodedCenter) {
          const lat = data.data.geocodedCenter.lat;
          const lon = data.data.geocodedCenter.lon;
          const center: [number, number] = [lat, lon];

          setSearchCenter(center);
          setUserCoords({ lat, lng: lon });

          finalCenters = [...data.data.centers]
            .sort((a: DonationCenter, b: DonationCenter) => {
              const distA = parseFloat(calculateDistance(lat, lon, a.coordinates.lat, a.coordinates.lng));
              const distB = parseFloat(calculateDistance(lat, lon, b.coordinates.lat, b.coordinates.lng));
              return distA - distB;
            })
            .filter((c: DonationCenter) =>
              parseFloat(calculateDistance(lat, lon, c.coordinates.lat, c.coordinates.lng)) <= 15
            );
        }

        setDonationCenters(finalCenters);

        if (finalCenters.length === 0) {
          alert("No hospitals or pharmacies found within 15km of this area. Try a different search.");
        }
      }
    } catch (error) {
      console.error('Failed to find donation centers:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const reportDonation = async (center: DonationCenter) => {
    try {
      const response = await fetch('/api/donate-dispose/report-donation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donationInfo: {
            medicine: medicineInfo,
            center: center,
            donatedAt: new Date().toISOString()
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Thank you for your donation! Your contribution helps others in need.');
      }
    } catch (error) {
      console.error('Failed to report donation:', error);
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'keep': return 'bg-info/10 text-info border-info/20';
      case 'donate': return 'bg-success/10 text-success border-success/20';
      case 'dispose': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'consult': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-muted';
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'keep': return Package;
      case 'donate': return Heart;
      case 'dispose': return AlertTriangle;
      case 'consult': return Info;
      default: return Recycle;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full mr-3">
              <Recycle className="h-8 w-8 text-primary" />
            </div>
            <Badge variant="secondary">Responsible Medicine Management</Badge>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Donate or Dispose Medicines
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get safety-first, rule-based guidance on whether to keep, donate, or safely dispose of your medicines.
          </p>
        </div>

        <Tabs defaultValue="assess" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assess">Assess Medicine</TabsTrigger>
            <TabsTrigger value="donate">Find Donation Centers</TabsTrigger>
            <TabsTrigger value="dispose">Disposal Guidelines</TabsTrigger>
          </TabsList>

          <TabsContent value="assess" className="space-y-6">
            {!recommendation && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2 text-primary" />
                    Medicine Information
                  </CardTitle>
                  <CardDescription>
                    Provide details about your medicine to get a recommendation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Medicine Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Paracetamol 500mg"
                        value={medicineInfo.name || ''}
                        onChange={(e) => setMedicineInfo({ ...medicineInfo, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="manufacturer">Manufacturer</Label>
                      <Input
                        id="manufacturer"
                        placeholder="e.g., ABC Pharmaceuticals"
                        value={medicineInfo.manufacturer || ''}
                        onChange={(e) => setMedicineInfo({ ...medicineInfo, manufacturer: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="expiryDate">Expiry Date *</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="expiryNA"
                            checked={expiryNotAvailable}
                            onChange={(e) => {
                              setExpiryNotAvailable(e.target.checked);
                              if (e.target.checked) setMedicineInfo({ ...medicineInfo, expiryDate: '' });
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <Label htmlFor="expiryNA" className="text-xs text-muted-foreground cursor-pointer">
                            Not visible / Not available
                          </Label>
                        </div>
                      </div>
                      <Input
                        id="expiryDate"
                        type="date"
                        disabled={expiryNotAvailable}
                        value={medicineInfo.expiryDate || ''}
                        onChange={(e) => setMedicineInfo({ ...medicineInfo, expiryDate: e.target.value })}
                        className={expiryNotAvailable ? "opacity-50" : ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="strength">Strength/Dosage</Label>
                      <Input
                        id="strength"
                        placeholder="e.g., 500mg, 10ml"
                        value={medicineInfo.strength || ''}
                        onChange={(e) => setMedicineInfo({ ...medicineInfo, strength: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Medicine Condition</Label>
                      <div className="space-y-2 mt-2">
                        {[
                          { value: 'unopened', label: 'Unopened/Sealed' },
                          { value: 'opened', label: 'Opened but unused' },
                          { value: 'partial', label: 'Partially used' }
                        ].map((option) => (
                          <label key={option.value} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="condition"
                              value={option.value}
                              checked={medicineInfo.condition === option.value}
                              onChange={(e) => setMedicineInfo({ ...medicineInfo, condition: e.target.value as any })}
                              className="text-primary"
                            />
                            <span className="text-sm">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Medicine Type</Label>
                      <div className="space-y-2 mt-2">
                        {[
                          { value: 'otc', label: 'Over-the-counter' },
                          { value: 'prescription', label: 'Prescription' },
                          { value: 'controlled', label: 'Controlled substance' },
                          { value: 'not-sure', label: 'Not Sure (Consult Pharmacist)' }
                        ].map((option) => (
                          <label key={option.value} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="medicineType"
                              value={option.value}
                              checked={medicineInfo.medicineType === option.value}
                              onChange={(e) => setMedicineInfo({ ...medicineInfo, medicineType: e.target.value as any })}
                              className="text-primary"
                            />
                            <span className="text-sm">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={getRecommendation}
                    disabled={!medicineInfo.name || (!medicineInfo.expiryDate && !expiryNotAvailable) || isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Recycle className="h-4 w-4 mr-2" />
                        Get Recommendation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {recommendation && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">Safety Assessment</h2>
                  <Button variant="outline" onClick={() => setRecommendation(null)}>
                    Assess Another Medicine
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Recommendation */}
                  <Card className="border-2 border-primary/10 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        {(() => {
                          const Icon = getRecommendationIcon(recommendation.recommendation);
                          return <Icon className="h-5 w-5 mr-2 text-primary" />;
                        })()}
                        {recommendation.recommendation === 'dispose' ? 'Dispose Safely' :
                          recommendation.recommendation === 'donate' ? 'Eligible for Donation' :
                            recommendation.recommendation === 'consult' ? 'Consult Pharmacist' : 'Keep for Use'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={cn(
                        "rounded-xl p-5 border mb-6",
                        getRecommendationColor(recommendation.recommendation)
                      )}>
                        <p className="text-sm font-medium leading-relaxed">
                          {recommendation.reasoning}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-bold text-foreground uppercase text-xs tracking-wider">Instructions:</h4>
                        <ul className="space-y-3">
                          {recommendation.instructions.map((instruction, idx) => (
                            <li key={idx} className="flex items-start space-x-3">
                              <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-muted-foreground">{instruction}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {recommendation.recommendation === 'donate' && (
                        <div className="mt-8 pt-6 border-t border-muted">
                          <Button
                            className="w-full h-12 text-lg font-bold"
                            onClick={() => {
                              // Find the tab trigger for 'donate' and click it
                              const donateTab = document.querySelector('[data-value="donate"]') as HTMLElement;
                              if (donateTab) donateTab.click();
                            }}
                          >
                            <MapIconUI className="h-5 w-5 mr-2" />
                            Find Nearby Donation Centers
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Resources & Warnings */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Info className="h-5 w-5 mr-2 text-info" />
                          Helpful Resources
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {recommendation.resources.map((resource, idx) => (
                            <li key={idx} className="flex items-center space-x-2">
                              <ExternalLink className="h-4 w-4 text-primary" />
                              <span className="text-sm text-foreground">{resource}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Shield className="h-5 w-5 mr-2 text-warning" />
                          Important Warnings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {recommendation.warnings.map((warning, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-muted-foreground">{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="donate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-primary" />
                  Find Donation Centers
                </CardTitle>
                <CardDescription>
                  Locate nearby centers that accept medicine donations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Enter your location (city, zip code)"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="pl-10 h-12"
                      />
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="h-12 px-4 border-primary/20 hover:bg-primary/5"
                        onClick={getUserLocation}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Use My Location
                      </Button>
                      <Button onClick={findDonationCenters} disabled={!location.trim()} className="h-12 px-8">
                        <MapPin className="h-4 w-4 mr-2" />
                        Search
                      </Button>
                    </div>
                  </div>

                  {donationCenters.length > 0 && (
                    <div className="flex items-center justify-between bg-muted/30 p-1.5 rounded-xl border border-muted/50">
                      <div className="px-3">
                        <p className="text-sm font-bold text-foreground flex items-center">
                          <Activity className="h-4 w-4 mr-2 text-primary" />
                          {donationCenters.length} Facilities Found
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant={viewMode === 'map' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('map')}
                          className="h-9 px-4 rounded-lg"
                        >
                          <MapIconUI className="h-4 w-4 mr-2" />
                          Map View
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className="h-9 px-4 rounded-lg"
                        >
                          <ListIcon className="h-4 w-4 mr-2" />
                          List View
                        </Button>
                      </div>
                    </div>
                  )}

                  {donationCenters.length > 0 ? (
                    <div className="space-y-6">
                      {viewMode === 'map' ? (
                        <div className="relative rounded-2xl overflow-hidden border-2 border-primary/10 shadow-2xl group animate-in fade-in zoom-in duration-500">
                          <DonationMap
                            centers={donationCenters}
                            centerLocation={searchCenter}
                          />
                        </div>
                      ) : (
                        <div className="grid gap-4 animate-in slide-in-from-bottom duration-500">
                          {donationCenters.map((center, index) => (
                            <Card key={index} className="hover:shadow-xl transition-all hover:border-primary border-primary/5 group bg-card/50 backdrop-blur-sm overflow-hidden">
                              <CardContent className="p-0">
                                <div className="flex items-center p-6 gap-6">
                                  <div className="bg-primary/10 p-5 rounded-2xl group-hover:bg-primary/20 transition-colors">
                                    {center.type === 'Hospital' ? (
                                      <Activity className="h-8 w-8 text-primary" />
                                    ) : (
                                      <Package className="h-8 w-8 text-primary" />
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="text-xl font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                        {center.name}
                                        {center.verified && (
                                          <CheckCircle className="h-4 w-4 ml-2 text-success inline-block" />
                                        )}
                                      </h4>
                                      {userCoords && (
                                        <div className="text-right flex-shrink-0">
                                          <p className="text-xl font-black text-primary">
                                            {calculateDistance(userCoords.lat, userCoords.lng, center.coordinates.lat, center.coordinates.lng)} km
                                          </p>
                                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">AWAY</p>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                                      <div className="flex items-center">
                                        <MapPin className="h-4 w-4 mr-1.5 text-primary/60" />
                                        {center.address}
                                      </div>
                                      <div className="flex items-center">
                                        <Badge variant="secondary" className="bg-primary/5 text-primary text-[10px] font-bold">
                                          {center.type}
                                        </Badge>
                                      </div>
                                    </div>

                                    {center.phone && (
                                      <div className="flex items-center mt-2 text-xs text-muted-foreground font-medium">
                                        <Phone className="h-3.5 w-3.5 mr-2 text-primary/40" />
                                        {center.phone}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    <Button
                                      variant="default"
                                      className="h-10 px-6 rounded-xl font-bold"
                                      onClick={() => reportDonation(center)}
                                    >
                                      Donate Here
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="h-10 px-6 rounded-xl border-primary/20 hover:bg-primary/10"
                                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${center.coordinates.lat},${center.coordinates.lng}`, '_blank')}
                                    >
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      Directions
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      <Alert className="bg-primary/5 border-primary/10 rounded-2xl">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-sm font-bold text-primary opacity-80 uppercase tracking-tight">
                          “Please contact the hospital to confirm donation acceptance.”
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-muted/30 rounded-2xl border-2 border-dashed border-muted">
                      {searchLoading ? (
                        <div className="space-y-4">
                          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary opacity-50" />
                          <p className="text-muted-foreground animate-pulse font-medium">Scanning live map for facilities...</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-background w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <MapPin className="h-10 w-10 text-muted-foreground/30" />
                          </div>
                          <div className="max-w-xs mx-auto">
                            <p className="font-semibold text-foreground">Find Nearby Centers</p>
                            <p className="text-sm text-muted-foreground mt-1">Enter a city or zip code to see dynamic results from the live medical network.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dispose" className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Proper disposal protects the environment and prevents misuse of medicines.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Safe Disposal Methods</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">FDA-Approved Methods:</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-success" />
                        Take to pharmacy take-back programs
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-success" />
                        Use DEA National Take Back Day events
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-success" />
                        Mail-back programs for controlled substances
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-success" />
                        Municipal hazardous waste programs
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Emergency Disposal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">If no take-back program available:</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Mix with unpalatable substance (coffee grounds, kitty litter)</li>
                      <li>• Place in sealed container or bag</li>
                      <li>• Remove personal information from labels</li>
                      <li>• Throw in household trash</li>
                    </ul>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Never flush medicines down the toilet unless specifically directed by the FDA.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
