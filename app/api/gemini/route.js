import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { initGemini, generateText, generateTextWithImage } from '@/lib/gemini';

// Initialize Gemini with API key
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is not defined in environment variables');
}

/**
 * POST handler for text generation
 */
export async function POST(req) {
  try {
    // Check authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to use this feature' },
        { status: 401 }
      );
    }

    // Initialize Gemini
    initGemini(apiKey);

    // Parse request body
    const body = await req.json();
    const { prompt, image, options = {} } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Generate response based on whether an image is provided
    let response;
    if (image) {
      response = await generateTextWithImage(prompt, image, options);
    } else {
      response = await generateText(prompt, options);
    }

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error('Error in Gemini API route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}