require('dotenv').config();
const Groq = require('groq-sdk');

console.log("Checking Environment Variables...");
if (!process.env.GROQ_API_KEY) {
    console.error(" ERROR: GROQ_API_KEY is missing from .env");
    process.exit(1);
} else {
    console.log(" GROQ_API_KEY is present (starts with " + process.env.GROQ_API_KEY.substring(0, 4) + "...)");
}

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function testGroq() {
    console.log("\nTesting Groq API Connection...");
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: 'Say Hello' }],
            model: 'llama-3.3-70b-versatile', // Trying latest versatile
        });
        console.log(" Success! Response:", chatCompletion.choices[0].message.content);
    } catch (error) {
        console.error("API Call Failed:");
        console.error("Message:", error.message);
        console.error("Type:", error.type);
        console.error("Code:", error.code);
        if (error.status) console.error("Status:", error.status);
    }
}

testGroq();
