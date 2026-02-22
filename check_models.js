import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function findWorkingModel() {
    console.log("Fetching available models...");
    let models = [];
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
            const errText = await response.text();
            console.error(`Failed to list models: ${response.status} ${response.statusText}\n${errText}`);
            return;
        }
        const data = await response.json();
        models = data.models.map(m => m.name.replace('models/', ''));
        console.log(`Found ${models.length} models. Testing for access...`);
    } catch (e) {
        console.error("Error listing models:", e);
        models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro", "gemini-pro"];
    }

    for (const modelName of models) {
        if (modelName.includes('vision') || modelName.includes('embedding') || modelName.includes('aqa')) continue;

        process.stdout.write(`Testing ${modelName} ... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello?");
            const response = await result.response;
            const text = response.text();
            console.log(`✅ SUCCESS!`);
            console.log(`\n>>> RECOMMENDED MODEL: ${modelName} <<<\n`);
            return;
        } catch (error) {
            console.log(`❌ Failed: ${error.message.split('\n')[0]}`);
        }
    }
    console.log("No working models found.");
}

findWorkingModel();
