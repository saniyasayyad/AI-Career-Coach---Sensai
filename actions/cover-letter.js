"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;

// Validate API key
if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY environment variable is not set");
}

export async function generateCoverLetter(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("AI service is not configured. Please contact support.");
  }

  // Validate input data
  console.log("Input data received:", data);
  if (!data || !data.companyName || !data.jobTitle || !data.jobDescription) {
    throw new Error("Missing required fields: companyName, jobTitle, and jobDescription are required");
  }

  // Test database connection first
  try {
    await db.$connect();
  } catch (dbError) {
    console.error("Database connection failed:", dbError);
    throw new Error("Database connection failed. Please try again later.");
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  // Validate user data
  console.log("User data:", {
    id: user.id,
    industry: user.industry,
    experience: user.experience,
    skills: user.skills,
    bio: user.bio
  });

  const prompt = `
    Write a professional cover letter for a ${data.jobTitle} position at ${
    data.companyName
  }.
    
    About the candidate:
    - Industry: ${user.industry}
    - Years of Experience: ${user.experience}
    - Skills: ${user.skills?.join(", ")}
    - Professional Background: ${user.bio}
    
    Job Description:
    ${data.jobDescription}
    
    Requirements:
    1. Use a professional, enthusiastic tone
    2. Highlight relevant skills and experience
    3. Show understanding of the company's needs
    4. Keep it concise (max 400 words)
    5. Use proper business letter formatting in markdown
    6. Include specific examples of achievements
    7. Relate candidate's background to job requirements
    
    Format the letter in markdown.
  `;

  // Helper: retry with exponential backoff on transient errors (e.g., 503)
  const generateWithRetry = async (maxAttempts = 3) => {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (!model) throw new Error("AI model unavailable");
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      } catch (err) {
        lastErr = err;
        const msg = String(err?.message || "");
        // Retry on 429/503/overloaded messages
        if (/(overloaded|unavailable|quota|rate|429|503)/i.test(msg) && attempt < maxAttempts) {
          const delayMs = 500 * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        break;
      }
    }
    throw lastErr;
  };

  // Fallback template if AI is unavailable
  const buildFallbackLetter = () => {
    const lines = [];
    lines.push(`Dear Hiring Manager,`);
    lines.push("");
    lines.push(`I am excited to apply for the ${data.jobTitle} role at ${data.companyName}. With ${user.experience ?? "several"} years in ${user.industry ?? "the industry"}, I have developed strengths in ${(user.skills || []).slice(0,5).join(", ")}.`);
    lines.push("");
    lines.push(`In my recent experience, I have delivered measurable results by leveraging my technical skills and collaborating across teams. I am confident I can quickly contribute to your goals and bring a positive, proactive attitude.`);
    lines.push("");
    lines.push(`I would welcome the opportunity to discuss how my background aligns with your needs. Thank you for your time and consideration.`);
    lines.push("");
    lines.push(`Sincerely,`);
    lines.push(`\n`);
    lines.push(`{Your Name}`);
    return lines.join("\n");
  };

  try {
    const content = await generateWithRetry(3);

    if (!content) {
      throw new Error("No content generated from AI");
    }

    console.log("Creating cover letter with data:", {
      contentLength: content.length,
      jobDescription: data.jobDescription?.substring(0, 100) + "...",
      companyName: data.companyName,
      jobTitle: data.jobTitle,
      userId: user.id
    });

    const coverLetter = await db.coverLetter.create({
      data: {
        content,
        jobDescription: data.jobDescription,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        status: "completed",
        userId: user.id,
      },
    });

    console.log("Cover letter created successfully:", coverLetter.id);
    return coverLetter;
  } catch (error) {
    console.error("Error generating cover letter:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    
    // Provide more specific error messages
    if (error.message.includes("API key")) {
      throw new Error("AI service configuration error. Please contact support.");
    } else if (error.message.includes("quota") || error.message.includes("limit")) {
      throw new Error("AI service quota exceeded. Please try again later.");
    } else if (error.message.includes("database") || error.message.includes("prisma")) {
      console.error("Database error details:", error);
      throw new Error(`Database error: ${error.message}`);
    } else if (/(overloaded|unavailable|quota|rate|429|503)/i.test(String(error?.message || ""))) {
      // Graceful fallback content so user isn't blocked
      const fallback = buildFallbackLetter();
      const coverLetter = await db.coverLetter.create({
        data: {
          content: fallback,
          jobDescription: data.jobDescription,
          companyName: data.companyName,
          jobTitle: data.jobTitle,
          status: "completed",
          userId: user.id,
        },
      });
      return coverLetter;
    } else {
      throw new Error(`Failed to generate cover letter: ${error.message}`);
    }
  }
}

export async function getCoverLetters() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.coverLetter.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.coverLetter.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });
}

export async function deleteCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.coverLetter.delete({
    where: {
      id,
      userId: user.id,
    },
  });
}