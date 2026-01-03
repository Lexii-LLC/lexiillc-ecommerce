
import { cleanProductNameWithAI } from '../lib/ai-product-cleaner'
import { config } from 'dotenv'

config()

async function test() {
  const name = "New Balance Grey 9060 Size 9.5 (1)"
  console.log(`Testing: "${name}"`)
  console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY)
  console.log('HUGGINGFACE_API_KEY exists:', !!(process.env.HUGGINGFACE_API_KEY || process.env.VITE_HUGGINGFACE_API_KEY))
  
  const result = await cleanProductNameWithAI(name)
  console.log('Result:', JSON.stringify(result, null, 2))
}

test().catch(console.error)
