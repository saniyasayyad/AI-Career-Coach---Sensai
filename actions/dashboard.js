"use server"

import { auth } from "@clerk/nextjs/server";
import { db } from "../lib/inngest/prisma";
import {GoogleGenerativeAI} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
});

export const generateAiInsights = async (industry) => {
    const prompt = 
    `Analyze the current trends, challenges, and opportunities in the ${industry} industry. in ONLY the following JSON format without any additional notes or explanations:
    {
        "salaryRanges" : [
        { "role : "string", "min": number, "max": number, "median": number, "location" : "string" }
        ],

        "growthRate": number, 
        "demandLevel" : "HIGH/MEDIUM/LOW",
        "topSkills": [ "skill1", "skill2", "skill3" ],
        "marketOutlook": "POSITIVE"/ "NEUTRAL" / "NEGATIVE",
        "keyTrends": [ "trend1", "trend2", "trend3" ],
        "recommendations": ["skill1", "skill2", "skill3"]
    }
        IMPORTANT: Return ONLY the JSON. No additional text or markdown formatting.
        Include at least 5 common roles for salary ranges.
        Growth rate should be a percentage value.
        Include at least 5 skills and trends.

    `;

    const result = await model.generateContent(promt)
    const response = result.response;
   const text = response.text();

   const cleanedText = text.replace(/```(?:json)?\n/g, '').trim();
   return JSON.parse(cleanedText);
};

export async function getIndustryInsights() {
    const { userId } = await auth();
    if (!userId) throw new Error("User not authenticated");
    const user = await db.user.findUnique({
        where: { 
            clerkUserId: userId,
        },
    });

    if (!user) throw new Error("User not found");

    if(!user.industryInsight) {
        const insights = await generateAiInsights(user.industry);

        const industryInsight = await db.industryInsight.create({
            data: {
                industry: user.industry,
                ...insights,
                nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            },
        });

        return industryInsight;
    }

   return user.industryInsight;
}