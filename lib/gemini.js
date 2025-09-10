import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
let geminiClient = null;

/**
 * Initialize the Gemini client with the API key
 * @param {string} apiKey - The Google Generative AI API key
 * @returns {GoogleGenerativeAI} - The initialized client
 */
export function initGemini(apiKey) {
  if (!apiKey) {
    throw new Error('Google Generative AI API key is required');
  }
  
  geminiClient = new GoogleGenerativeAI(apiKey);
  return geminiClient;
}

/**
 * Get the Gemini client instance
 * @returns {GoogleGenerativeAI} - The Gemini client instance
 */
export function getGeminiClient() {
  if (!geminiClient) {
    throw new Error('Gemini client not initialized. Call initGemini first.');
  }
  return geminiClient;
}

/**
 * Generate text using Gemini Pro model
 * @param {string} prompt - The prompt to generate text from
 * @param {Object} options - Additional options for generation
 * @returns {Promise<string>} - The generated text
 */
export async function generateText(prompt, options = {}) {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: 'gemini-pro' });
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating text with Gemini:', error);
    throw error;
  }
}

/**
 * Generate text with image using Gemini Pro Vision model
 * @param {string} prompt - The text prompt
 * @param {string|Blob} image - The image as a URL or Blob
 * @param {Object} options - Additional options for generation
 * @returns {Promise<string>} - The generated text
 */
export async function generateTextWithImage(prompt, image, options = {}) {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: 'gemini-pro-vision' });
  
  let imageData;
  if (typeof image === 'string' && image.startsWith('data:')) {
    // Handle data URL
    imageData = { inlineData: { data: image.split(',')[1], mimeType: image.split(';')[0].split(':')[1] } };
  } else if (typeof image === 'string') {
    // Handle URL
    imageData = { uri: image };
  } else {
    // Handle Blob or File
    const base64 = await blobToBase64(image);
    imageData = { inlineData: { data: base64.split(',')[1], mimeType: image.type } };
  }
  
  try {
    const result = await model.generateContent([prompt, imageData]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating text with image using Gemini:', error);
    throw error;
  }
}

/**
 * Convert a Blob to base64 string
 * @param {Blob} blob - The blob to convert
 * @returns {Promise<string>} - The base64 string
 */
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}