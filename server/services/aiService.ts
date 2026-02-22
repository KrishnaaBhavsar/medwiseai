import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Simple Cache Interface
interface CacheEntry {
  data: any;
  timestamp: number;
}

export class AIService {
  private medicineCache = new Map<string, CacheEntry>();
  private CACHE_TTL = 1000 * 60 * 60; // 1 hour

  private async callWithRetry<T>(fn: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> {
    let lastError: any;
    let delay = initialDelay;

    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if it's a 429 error
        const isRateLimit = error?.status === 429 ||
          error?.message?.includes('429') ||
          error?.message?.includes('Too Many Requests') ||
          error?.errorDetails?.some((d: any) => d.reason === 'RATE_LIMIT_EXCEEDED');

        if (isRateLimit && i < retries - 1) {
          console.warn(`AI Service: Rate limited. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue;
        }

        throw error;
      }
    }
    throw lastError;
  }

  async analyzePrescription(extractedText: string): Promise<any> {
    try {
      const prompt = `
      You are a medical AI assistant. Analyze the following prescription/medical report text and provide a structured response:

      Text: "${extractedText}"

      Please provide:
      1. A list of medications with their purposes, dosages, and frequencies
      2. A simple summary in plain language
      3. Key points for the patient
      4. Any important warnings or side effects

      Format your response as JSON with this structure:
      {
        "medications": [
          {
            "name": "Medicine name and strength",
            "purpose": "What this medicine treats",
            "dosage": "Amount per dose",
            "frequency": "How often to take",
            "sideEffects": ["list", "of", "common", "side", "effects"],
            "warnings": ["important", "warnings"]
          }
        ],
        "summary": "Brief explanation in simple terms",
        "keyPoints": ["important", "points", "for", "patient"],
        "disclaimer": "Medical disclaimer text"
      }
      `;

      const result = await this.callWithRetry(() => model.generateContent(prompt));
      const response = await result.response;
      let content = response.text();

      console.log('Gemini Raw Response (Prescription):', content.substring(0, 100) + '...'); // Log for debugging

      if (content) {
        try {
          // Clean markdown JSON blocks if present
          content = content.replace(/```json\n?|\n?```/g, '').trim();
          return JSON.parse(content);
        } catch (parseError) {
          // Fallback if JSON parsing fails
          return this.createFallbackPrescriptionResponse(extractedText);
        }
      }
      return this.createFallbackPrescriptionResponse(extractedText);
    } catch (error) {
      console.error('AI Service Error (Prescription):', error);
      return this.createFallbackPrescriptionResponse(extractedText);
    }
  }

  async analyzeOCRText(ocrText: string): Promise<any> {
    try {
      const prompt = `
      Analyze this OCR text from a medicine strip/package and extract structured information:

      OCR Text: "${ocrText}"

      Extract and provide this information in JSON format:
      {
        "name": "Medicine name",
        "manufacturer": "Company name",
        "expiryDate": "YYYY-MM-DD format",
        "batchNumber": "Batch/Lot number",
        "strength": "Dosage strength",
        "isExpired": false,
        "recommendation": "keep|donate|dispose",
        "reasoning": "Explanation for recommendation"
      }

      If expiry date suggests medicine is expired, set isExpired to true and recommendation to "dispose".
      If medicine is not expired, recommend "donate" for unused medicines or "keep" for current use.
      `;

      const result = await this.callWithRetry(() => model.generateContent(prompt));
      const response = await result.response;
      let content = response.text();

      console.log('Gemini Raw Response (OCR):', content.substring(0, 100) + '...');

      if (content) {
        try {
          content = content.replace(/```json\n?|\n?```/g, '').trim();
          const parsed = JSON.parse(content);
          // Validate expiry date and set recommendation
          if (parsed.expiryDate) {
            const expiry = new Date(parsed.expiryDate);
            const today = new Date();
            parsed.isExpired = expiry < today;

            if (parsed.isExpired) {
              parsed.recommendation = 'dispose';
              parsed.reasoning = 'Medicine has expired. Please dispose of it safely according to local guidelines.';
            } else if (!parsed.recommendation || parsed.recommendation === 'keep') {
              parsed.recommendation = 'donate';
              parsed.reasoning = 'Medicine is within expiry date and in good condition. Consider donating to local pharmacy or healthcare center.';
            }
          }
          return parsed;
        } catch (parseError) {
          return this.createFallbackOCRResponse(ocrText);
        }
      }
      return this.createFallbackOCRResponse(ocrText);
    } catch (error) {
      console.error('OCR AI Analysis Error:', error);
      return this.createFallbackOCRResponse(ocrText);
    }
  }

  async getOTCRecommendations(symptoms: string, userInfo?: any): Promise<any> {
    try {
      const { age, allergies, currentMedications } = userInfo || {};

      const prompt = `
      As a medical AI assistant, provide over-the-counter medicine recommendations for these symptoms: "${symptoms}"

      Patient Context:
      - Age: ${age || 'Not specified'}
      - Known Allergies: ${allergies && allergies.length > 0 ? allergies.join(', ') : 'None reported'}
      - Currently Taking: ${currentMedications && currentMedications.length > 0 ? currentMedications.join(', ') : 'No current medications reported'}

      Please provide a structured response in JSON format:
      {
        "recommendations": [
          {
            "medicine": "OTC medicine name",
            "type": "Medicine category (pain reliever, antacid, etc.)",
            "dosage": "Typical adult dosage",
            "duration": "How long to use",
            "sideEffects": ["common", "side", "effects"],
            "warnings": ["important", "warnings"]
          }
        ],
        "generalAdvice": "General health advice for these symptoms",
        "whenToSeeDoctor": "Warning signs that require medical attention",
        "safetyNotes": "Specific safety notes regarding drug interactions or allergies (only if relevant)",
        "disclaimer": "Important medical disclaimer"
      }

      CRITICAL SAFETY INSTRUCTIONS:
      1. If the user is already taking medicines:
         - CAREFULLY review them before suggesting new ones.
         - AVOID suggesting the same medicine again unless you explain how to continue safely.
         - WARN about possible drug interactions (e.g., Aspirin with Blood Thinners).
         - WARN about overdose risks (e.g., multi-symptom cold meds that both contain Acetaminophen).
         - FLAG any unsafe combinations.
      2. If the user has allergies:
         - DO NOT recommend anything containing their allergens.
         - Warn if a common medicine belongs to a class they are allergic to (e.g., NSAIDs).
      3. If the user is NOT taking any current medicines:
         - Provide normal OTC recommendations without extra safety warnings in the "safetyNotes" field.
      4. ALWAYS check for age-appropriateness (e.g., no Aspirin for children due to Reye's syndrome risk).

      Formatting Guidelines:
      1. For ALL fields (especially "dosage", "generalAdvice" and "whenToSeeDoctor"), use natural, conversational language.
      2. Use short, clear sentences. 
      3. DO NOT use markdown formatting (no asterisks, no bolding, no backticks).
      4. DO NOT use bullet points or robotic lists within a single string field.
      5. Keep it friendly but professional.
      6. For "dosage", provide simple, clear instructions (e.g., "Take one tablet every 4-6 hours as needed").

      Important: Only recommend common, safe OTC medicines. Include strong medical disclaimers.
      `;

      const result = await this.callWithRetry(() => model.generateContent(prompt));
      const response = await result.response;
      let content = response.text();

      console.log('Gemini Raw Response (OTC):', content.substring(0, 100) + '...');

      if (content) {
        try {
          content = content.replace(/```json\n?|\n?```/g, '').trim();
          return JSON.parse(content);
        } catch (parseError) {
          return this.createFallbackOTCResponse(symptoms);
        }
      }
      return this.createFallbackOTCResponse(symptoms);
    } catch (error) {
      console.error('OTC Recommendations Error:', error);
      return this.createFallbackOTCResponse(symptoms);
    }
  }

  async chatbotResponse(message: string, context: string = ''): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
      console.error('AI Service: GEMINI_API_KEY is missing in environment variables');
      return "I'm sorry, I'm currently unable to process requests because my AI engine is not configured. Please contact the administrator.";
    }

    try {
      const systemPrompt = `You are MedWise AI, a friendly healthcare buddy. 
      Talk like a caring human, keep it simple and short (2-3 sentences).

      What you can do:
      1. Explain prescriptions or reports in simple English.
      2. Scan medicine strips to check expiry and dosage.
      3. Help with donating or disposing of old medicines.
      4. Give quick OTC suggestions for common things (headaches, etc.).

      Tone & Rules:
      - If someone asks "how to start" or "what can you do", briefly tell them you can help explain reports, scan medicine strips, or guide them on disposing/donating meds.
      - Keep it conversational. No robotic lists.
      - If things sound serious, suggest seeing a doctor. 
      - IMPORTANT: Only add the tiny disclaimer "(Not medical advice)" if the user asks about specific medicines, dosages, or medical tips. For general greetings or "how to start" type questions, skip it.
      `;

      let fullPrompt = systemPrompt;
      if (context) {
        fullPrompt += `\n\nRecent Conversation History:\n${context.slice(-2000)}`; // Keep context reasonable
      }
      fullPrompt += `\n\nUser Question: ${message}\n\nMedWise AI Response:`;

      const result = await this.callWithRetry(() => model.generateContent(fullPrompt));
      const response = await result.response;
      let botResponse = response.text();

      if (!botResponse) {
        throw new Error('Empty response from AI model');
      }

      return botResponse;
    } catch (error) {
      console.error('Chatbot AI Error:', error);
      return "I'm having a bit of trouble processing that right now. For urgent health matters, please consult a healthcare professional. How else can I help you today?";
    }
  }



  async getMedicineDetails(medicineName: string): Promise<any> {
    const normalizedName = medicineName.toLowerCase().trim();

    // Check Cache
    const cached = this.medicineCache.get(normalizedName);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      console.log(`Cache hit for medicine details: ${normalizedName}`);
      return cached.data;
    }

    try {
      const prompt = `
      Provide detailed information about this medicine: "${medicineName}"

      Respond in JSON format with exactly this structure:
      {
        "name": "Standardized Medicine Name",
        "category": "Broad Category (e.g. Pain Reliever, Antibiotic)",
        "description": "Clear description of what it is and what it treats",
        "dosage": "Typical dosage instructions (general)",
        "warnings": ["List", "of", "important", "warnings"],
        "sideEffects": ["Common", "side", "effects"],
        "uses": ["List", "of", "common", "uses"]
      }
      
      If the medicine name is not recognized or invalid, return null.
      `;

      const result = await this.callWithRetry(() => model.generateContent(prompt));
      const response = await result.response;
      let content = response.text();

      console.log('Gemini Raw Response (Medicine Details):', content.substring(0, 100) + '...');

      if (content) {
        try {
          content = content.replace(/```json\n?|\n?```/g, '').trim();
          if (content === 'null') return null;
          const parsed = JSON.parse(content);

          // Store in cache
          this.medicineCache.set(normalizedName, {
            data: parsed,
            timestamp: Date.now()
          });

          return parsed;
        } catch (parseError) {
          return this.createFallbackMedicineDetails(medicineName);
        }
      }
      return this.createFallbackMedicineDetails(medicineName);
    } catch (error) {
      console.error('Medicine Details Error:', error);
      return this.createFallbackMedicineDetails(medicineName);
    }
  }

  // Fallback methods for when AI service fails
  private createFallbackPrescriptionResponse(text: string) {
    return {
      medications: [
        {
          name: "Unable to analyze - Please consult your pharmacist",
          purpose: "Text analysis unavailable",
          dosage: "As prescribed",
          frequency: "As directed",
          sideEffects: ["Consult healthcare provider"],
          warnings: ["Please verify with your doctor"]
        }
      ],
      summary: "AI analysis is currently unavailable. Please consult your healthcare provider for medication information.",
      keyPoints: [
        "Take medications as prescribed",
        "Consult your pharmacist for questions",
        "Keep regular medical appointments"
      ],
      disclaimer: "This AI analysis service is temporarily unavailable. Always consult healthcare professionals for medical advice."
    };
  }

  private createFallbackOCRResponse(text: string) {
    return {
      name: "Unable to read text clearly",
      manufacturer: "Please check manually",
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      batchNumber: "Unknown",
      strength: "Please check packaging",
      isExpired: false,
      recommendation: 'dispose',
      reasoning: "OCR analysis failed. Please check expiry date manually and dispose if expired."
    };
  }

  private createFallbackOTCResponse(symptoms: string) {
    return {
      recommendations: [
        {
          medicine: "Consult pharmacist for recommendations",
          type: "Professional guidance",
          dosage: "As recommended by pharmacist",
          duration: "As advised",
          sideEffects: ["Varies by medication"],
          warnings: ["Consult healthcare provider"]
        }
      ],
      generalAdvice: "Please consult a pharmacist or healthcare provider for appropriate recommendations.",
      whenToSeeDoctor: "If symptoms persist or worsen, seek medical attention immediately.",
      safetyNotes: "",
      disclaimer: "AI recommendations are unavailable. Please consult healthcare professionals."
    };
  }

  private createFallbackMedicineDetails(medicineName: string) {
    return {
      name: medicineName,
      category: "Unknown",
      description: "Details currently unavailable",
      dosage: "Consult a healthcare provider",
      warnings: ["Consult a doctor before use"],
      sideEffects: [],
      uses: []
    };
  }
}

export const aiService = new AIService();

