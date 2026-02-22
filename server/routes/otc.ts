import { RequestHandler } from "express";
import { aiService } from "../services/aiService";

export const getOTCRecommendations: RequestHandler = async (req, res) => {
  try {
    const { symptoms, age, weight, allergies, currentMedications } = req.body;

    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length < 2) {
      return res.status(400).json({
        error: 'Invalid symptoms',
        message: 'Please provide symptoms description (minimum 2 characters)'
      });
    }

    const userInfo = {
      age: age || null,
      weight: weight || null,
      allergies: allergies || [],
      currentMedications: currentMedications || []
    };

    // Get AI-powered OTC recommendations
    const recommendations = await aiService.getOTCRecommendations(symptoms, userInfo);

    res.json({
      success: true,
      data: {
        ...recommendations,
        query: {
          symptoms,
          userInfo
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('OTC recommendations error:', error);
    res.status(500).json({
      error: 'Recommendations failed',
      message: error instanceof Error ? error.message : 'Failed to get OTC recommendations'
    });
  }
};

export const searchOTCMedicines: RequestHandler = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Invalid search query',
        message: 'Please provide a search term'
      });
    }

    // AI-powered search for detailed description
    const aiResult = await aiService.getMedicineDetails(query);

    // Prepare results list
    let results = [];

    if (aiResult) {
      // If AI found specific medicine, put it at the top
      results.push({
        name: aiResult.name,
        category: aiResult.category,
        description: aiResult.description,
        dosage: aiResult.dosage,
        warnings: aiResult.warnings,
        sideEffects: aiResult.sideEffects,
        uses: aiResult.uses,
        isAIResult: true
      });
    }

    // Also include mock results that match (for discovery)
    const mockResults = [
      {
        name: "Paracetamol",
        category: "Pain reliever",
        description: "Common pain and fever reducer",
        dosage: "500mg every 4-6 hours",
        warnings: ["Do not exceed 4g per day", "Avoid alcohol"]
      },
      {
        name: "Ibuprofen",
        category: "Anti-inflammatory",
        description: "Pain, inflammation, and fever reducer",
        dosage: "200-400mg every 4-6 hours",
        warnings: ["Take with food", "Avoid if stomach ulcers"]
      },
      {
        name: "Antacid",
        category: "Digestive",
        description: "Neutralizes stomach acid",
        dosage: "As needed for heartburn",
        warnings: ["Do not use for more than 2 weeks"]
      }
    ].filter(med =>
      (med.name.toLowerCase().includes(query.toLowerCase()) ||
        med.category.toLowerCase().includes(query.toLowerCase())) &&
      (!aiResult || med.name.toLowerCase() !== aiResult.name.toLowerCase())
    );

    results = [...results, ...mockResults];

    res.json({
      success: true,
      data: {
        results: results,
        query,
        total: results.length
      }
    });

  } catch (error) {
    console.error('OTC search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Failed to search OTC medicines'
    });
  }
};

export const getOTCCategories: RequestHandler = async (req, res) => {
  try {
    const categories = [
      {
        name: "Pain Relief",
        description: "Headaches, body aches, fever",
        icon: "pill",
        medicines: ["Paracetamol", "Ibuprofen", "Aspirin"]
      },
      {
        name: "Digestive Health",
        description: "Stomach issues, heartburn, nausea",
        icon: "stomach",
        medicines: ["Antacids", "Anti-diarrheal", "Probiotics"]
      },
      {
        name: "Cold & Flu",
        description: "Cough, congestion, runny nose",
        icon: "thermometer",
        medicines: ["Cough syrup", "Decongestants", "Throat lozenges"]
      },
      {
        name: "Allergy Relief",
        description: "Sneezing, itching, hives",
        icon: "allergen",
        medicines: ["Antihistamines", "Eye drops", "Nasal sprays"]
      },
      {
        name: "Skin Care",
        description: "Cuts, rashes, burns",
        icon: "bandage",
        medicines: ["Antiseptic", "Hydrocortisone", "Bandages"]
      },
      {
        name: "Sleep & Wellness",
        description: "Sleep aids, vitamins, supplements",
        icon: "moon",
        medicines: ["Melatonin", "Vitamins", "Minerals"]
      }
    ];

    res.json({
      success: true,
      data: {
        categories,
        total: categories.length
      }
    });

  } catch (error) {
    console.error('Get OTC categories error:', error);
    res.status(500).json({
      error: 'Failed to fetch categories',
      message: 'Could not retrieve OTC categories'
    });
  }
};
const COMMON_MEDICINES = [
  "Paracetamol", "Acetaminophen", "Ibuprofen", "Aspirin", "Naproxen", "Diclofenac",
  "Cetirizine", "Loratadine", "Fexofenadine", "Diphenhydramine", "Chlorpheniramine",
  "Omeprazole", "Lansoprazole", "Ranitidine", "Famotidine", "Antacid", "Magnesium Hydroxide",
  "Guaifenesin", "Dextromethorphan", "Codeine", "Phenylephrine", "Pseudoephedrine",
  "Loperamide", "Bismuth Subsalicylate", "Simethicone", "Bisacodyl", "Senna",
  "Hydrocortisone", "Clotrimazole", "Miconazole", "Terbinafine", "Bacitracin", "Neomycin",
  "Melatonin", "Valerian Root", "Chamomile", "Magnesium", "Vitamin C", "Vitamin D", "Zinc",
  "Advil", "Tylenol", "Motrin", "Aleve", "Zyrtec", "Claritin", "Allegra", "Benadryl",
  "Prilosec", "Nexium", "Pepcid", "Zantac", "Tums", "Rolaids", "Pepto-Bismol",
  "DayQuil", "NyQuil", "Mucinex", "Robitussin", "Sudafed", "Imodium", "Dulcolax", "Ex-Lax"
];

export const getOTCSuggestions: RequestHandler = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.json({ success: true, data: { suggestions: [] } });
    }

    const filteredSuggestions = COMMON_MEDICINES.filter(med =>
      med.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10); // Limit to top 10 suggestions

    res.json({
      success: true,
      data: {
        suggestions: filteredSuggestions,
        total: filteredSuggestions.length
      }
    });
  } catch (error) {
    console.error('Get OTC suggestions error:', error);
    res.status(500).json({
      error: 'Failed to fetch suggestions',
      message: 'Could not retrieve medicine suggestions'
    });
  }
};
