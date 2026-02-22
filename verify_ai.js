import { AIService } from './server/services/aiService.js';
import 'dotenv/config';

const aiService = new AIService();

async function testAI() {
    console.log("--- Testing Chatbot Response ---");
    try {
        const chatResp = await aiService.chatbotResponse("How do I start?");
        console.log("Chatbot response:", chatResp);
    } catch (e) {
        console.error("Chatbot test failed:", e.message);
    }

    console.log("\n--- Testing OTC Recommendation ---");
    try {
        const symptoms = "headache and fever";
        const userInfo = { age: 30, allergies: [] };
        const otcResp = await aiService.getOTCRecommendations(symptoms, userInfo);
        console.log("OTC response:", JSON.stringify(otcResp, null, 2));
    } catch (e) {
        console.error("OTC test failed:", e.message);
    }
}

testAI();
