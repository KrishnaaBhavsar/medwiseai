
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY; // Ensure this is set in your .env
const genAI = new GoogleGenerativeAI(apiKey);

async function findWorkingModel() {
    console.log("Fetching available models...");
    let models = [];
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
            console.error(`Failed to list models: ${response.statusText}`);
            return;
        }
        const data = await response.json();
        models = data.models.map(m => m.name.replace('models/', ''));
        console.log(`Found ${models.length} models. Testing for write access...`);
    } catch (e) {
        console.error("Error listing models:", e);
        // Fallback list if listing fails
        models = ["gemini-1.5-flash", "gemini-1.5-flash-001", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
    }

    // Prioritize flash models as they are faster/cheaper
    models.sort((a, b) => {
        if (a.includes('flash') && !b.includes('flash')) return -1;
        if (!a.includes('flash') && b.includes('flash')) return 1;
        return 0;
    });

    for (const modelName of models) {
        // Skip vision-only or specific models that might not accept text-only prompts if we don't want to complicate the test
        if (modelName.includes('vision') || modelName.includes('embedding')) continue;

        process.stdout.write(`Testing ${modelName} ... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello, are you working?");
            const response = await result.response;
            const text = response.text();
            console.log(`✅ SUCCESS!`);
            console.log(`\n>>> RECOMMENDED MODEL: ${modelName} <<<\n`);
            return; // Stop after finding the first working one
        } catch (error) {
            if (error.status === 429) {
                console.log(`❌ Quota Exceeded (429)`);
            } else if (error.status === 404) {
                console.log(`❌ Not Found (404)`);
            } else {
                console.log(`❌ Failed: ${error.message.split('\n')[0]}`);
            }
        }
    }
    console.log("No working models found.");
}

findWorkingModel();
