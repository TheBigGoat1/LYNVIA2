// Quick test to verify Groq API key works with Vercel AI SDK
const { generateObject } = require('ai');
const { createGroq } = require('@ai-sdk/groq');
const { z } = require('zod');
require('dotenv').config({ path: '.env.local' });

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || '',
});

async function testGroq() {
  console.log('Testing Groq API...');
  console.log('API Key present:', !!process.env.GROQ_API_KEY);
  
  try {
    const result = await generateObject({
      model: groq('openai/gpt-oss-120b'),
      schema: z.object({
        message: z.string(),
        works: z.boolean(),
      }),
      prompt: 'Return a JSON object with message: "Groq API works!" and works: true',
    });
    
    console.log('✅ Success!');
    console.log('Response:', result.object);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.responseBody) {
      console.error('Response body:', error.responseBody);
    }
  }
}

testGroq();
