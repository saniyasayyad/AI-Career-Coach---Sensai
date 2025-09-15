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
  Provide realistic data based on current market conditions and industry reports.
  Return ONLY this EXACT JSON with UPPERCASE enum values, no markdown or prose:
  {
    "salaryRanges": [
      { "role": "Entry Level", "min": 40000, "max": 60000, "median": 50000, "location": "United States" },
      { "role": "Mid Level", "min": 60000, "max": 90000, "median": 75000, "location": "United States" },
      { "role": "Senior Level", "min": 90000, "max": 130000, "median": 110000, "location": "United States" }
    ],
    "growthRate": 5.2,
    "demandLevel": "HIGH",
    "topSkills": ["Technical Skills", "Problem Solving", "Communication"],
    "recommendedSkills": ["Emerging Technologies", "Data Analysis", "Project Management"],
    "marketOutlook": "POSITIVE",
    "keyTrends": ["Digital Transformation", "Remote Work", "Sustainability"]
  }
  
  IMPORTANT: 
  - growthRate should be a realistic percentage (e.g., 3.5, 7.2, 12.8)
  - Use actual industry data and trends
  - Ensure all fields have meaningful values
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
      growthRate: typeof insights.growthRate === "number" && insights.growthRate > 0 
        ? insights.growthRate 
        : 4.5, // Default realistic growth rate
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

    console.log("Parsed insights:", {
      growthRate: payload.growthRate,
      demandLevel: payload.demandLevel,
      marketOutlook: payload.marketOutlook,
      topSkillsCount: payload.topSkills.length
    });

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
      salaryRanges: [
        { "role": "Entry Level", "min": 40000, "max": 60000, "median": 50000, "location": "United States" },
        { "role": "Mid Level", "min": 60000, "max": 90000, "median": 75000, "location": "United States" },
        { "role": "Senior Level", "min": 90000, "max": 130000, "median": 110000, "location": "United States" }
      ],
      growthRate: 4.5, // Realistic fallback growth rate
      demandLevel: "MEDIUM",
      topSkills: ["Technical Skills", "Problem Solving", "Communication", "Teamwork"],
      recommendedSkills: ["Emerging Technologies", "Data Analysis", "Project Management", "Leadership"],
      marketOutlook: "NEUTRAL",
      keyTrends: ["Digital Transformation", "Remote Work", "Sustainability", "Automation"],
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

export async function refreshIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("User not authenticated");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, industry: true },
  });

  if (!user) throw new Error("User not found");
  if (!user.industry) throw new Error("User has no industry set");

  // Delete existing insights to force regeneration
  await db.industryInsight.deleteMany({
    where: { industry: user.industry },
  });

  // Generate fresh insights
  return await getIndustryInsights();
}
