import { GoogleGenerativeAI } from "@google/generative-ai";
import { inngest } from "./client";
import { db } from "./prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

export const generateIndustryInsights = inngest.createFunction(
  { name: "Generate Industry Insights" },
  { cron: "0 0 * * 0" }, // runs every Sunday at midnight
  async ({ step }) => {
    const industries = await step.run("Fetch industries", async () => {
      return await db.industryInsight.findMany({
        select: { industry: true },
        take: 5, // avoid timeouts, batch later
      });
    });

    for (const { industry } of industries) {
      const prompt = `
Analyze the current trends, challenges, and opportunities in the ${industry} industry.
Return ONLY this EXACT JSON with UPPERCASE enum values, no markdown or prose:
{
  "salaryRanges": [
    { "role": "string", "min": 0, "max": 0, "median": 0, "location": "string" }
  ],
  "growthRate": number,
  "demandLevel": "HIGH" | "MEDIUM" | "LOW",
  "topSkills": ["string"],
  "recommendedSkills": ["string"],
  "marketOutlook": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "keyTrends": ["trend1", "trend2", "trend3" ]
}
IMPORTANT: Return valid JSON only.
      `;

      const res = await step.run(`Generate ${industry} insights`, async () => {
        try {
          return await model.generateContent(prompt);
        } catch (err) {
          console.error(`Gemini error for ${industry}:`, err);
          return null;
        }
      });

      if (!res) continue;

      const text = res?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

      let insights = {};
      try {
        insights = JSON.parse(cleanedText);
      } catch (err) {
        console.error(`Failed to parse Gemini output for ${industry}:`, cleanedText);
        continue; // skip this industry
      }

      await step.run(`Update ${industry} insights`, async () => {
        await db.industryInsight.update({
          where: { industry },
          data: {
            ...insights,
            lastUpdated: new Date(),
            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
          },
        });
      });
    }

    return { updated: industries.length, status: "success" };
  }
);
