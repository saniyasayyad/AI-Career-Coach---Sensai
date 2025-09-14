"use server";

import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "../lib/generated/prisma"; 
import { GoogleGenerativeAI } from "@google/generative-ai";

const db = new PrismaClient();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
});

// ✅ Wrapper to call Gemini safely with quick fail on rate limit (SSR-friendly)
async function callGemini(prompt) {
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("429") || message.toLowerCase().includes("quota")) {
      const rateLimitError = new Error("RATE_LIMIT");
      rateLimitError.code = "RATE_LIMIT";
      throw rateLimitError;
    }
    throw error;
  }
}

export async function generateAiInsights(industry) {
  const prompt = `
  Analyze the current trends, challenges, and opportunities in the ${industry} industry.
  Return ONLY this EXACT JSON with UPPERCASE enum values, no markdown or prose:
  {
    "salaryRanges": [
      { "role": "string", "min": 0, "max": 0, "median": 0, "location": "string" }
    ],
    "growthRate": 0,
    "demandLevel": "HIGH" | "MEDIUM" | "LOW",
    "topSkills": ["string"],
    "recommendedSkills": ["string"],
    "marketOutlook": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
    "keyTrends": ["string"]
  }
  `;

  return callGemini(prompt);
}

export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("User not authenticated");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, industry: true },
  });

  if (!user) throw new Error("User not found");
  if (!user.industry) throw new Error("User has no industry set");

  // ✅ Step 1: Check if cached in DB
  let industryInsight = await db.industryInsight.findUnique({
    where: { industry: user.industry },
  });

  if (industryInsight) {
    console.log("Returning cached insights from DB");
    return industryInsight;
  }

  // ✅ Step 2: Generate from Gemini if not cached
  try {
    const insights = await generateAiInsights(user.industry);

    // Ensure keys align with Prisma schema
    const payload = {
      industry: user.industry,
      salaryRanges: insights.salaryRanges ?? [],
      growthRate: typeof insights.growthRate === "number" ? insights.growthRate : 0,
      demandLevel: insights.demandLevel ?? "MEDIUM",
      topSkills: Array.isArray(insights.topSkills) ? insights.topSkills : [],
      recommendedSkills: Array.isArray(insights.recommendedSkills)
        ? insights.recommendedSkills
        : Array.isArray(insights.recommendations)
        ? insights.recommendations
        : [],
      marketOutlook: insights.marketOutlook ?? "NEUTRAL",
      keyTrends: Array.isArray(insights.keyTrends) ? insights.keyTrends : [],
      nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    industryInsight = await db.industryInsight.create({
      data: payload,
    });

    console.log("Generated new insights from Gemini");
    return industryInsight;
  } catch (error) {
    // Graceful fallback on rate limits or AI errors
    if (error?.code === "RATE_LIMIT") {
      console.warn("Gemini rate limited. Returning fallback insights.");
    } else {
      console.error("Failed to generate industry insights:", error);
    }

    const fallback = {
      industry: user.industry,
      salaryRanges: [],
      growthRate: 0,
      demandLevel: "MEDIUM",
      topSkills: [],
      recommendedSkills: [],
      marketOutlook: "NEUTRAL",
      keyTrends: [],
      nextUpdate: new Date(Date.now() + 60 * 60 * 1000), // retry in 1 hour
    };

    try {
      // Try to persist fallback for caching layer; ignore unique conflicts
      industryInsight = await db.industryInsight.create({ data: fallback });
      return industryInsight;
    } catch (_) {
      return fallback; // return non-persisted fallback
    }
  }
}
