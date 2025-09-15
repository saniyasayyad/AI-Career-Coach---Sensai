"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI
  ? genAI.getGenerativeModel({ model: "gemini-1.5-pro" })
  : null;

export async function generateQuiz() {
    const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const user = await db.user.findUnique({
            where: {
                clerkUserId: userId,
            },
        });
        if (!user) throw new Error ("User not found");

        const safeIndustry = user.industry || "software engineering";
        const safeSkills = Array.isArray(user.skills) ? user.skills : [];
        const prompt = `
          Generate 10 technical interview questions for a ${
            safeIndustry
          } professional${
          safeSkills.length ? ` with expertise in ${safeSkills.join(", ")}` : ""
        }.
          
          Each question should be multiple choice with 4 options.
          
          Return the response in this JSON format only, no additional text:
          {
            "questions": [
              {
                "question": "string",
                "options": ["string", "string", "string", "string"],
                "correctAnswer": "string",
                "explanation": "string"
              }
            ]
          }
  `;

  try {
    // If API key or model missing, skip to fallback
    if (!model) throw new Error("Missing GEMINI_API_KEY or model unavailable");

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Try several parsing strategies
    let cleaned = text
      .replace(/```json[\s\S]*?\n/g, "")
      .replace(/```[\s\S]*?\n/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Try to extract the first JSON object with braces
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        const candidate = cleaned.slice(start, end + 1);
        parsed = JSON.parse(candidate);
      }
    }

    // Validate shape
    const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
    const normalized = questions
      .filter((q) => q && q.question && Array.isArray(q.options) && q.options.length === 4)
      .slice(0, 10)
      .map((q) => ({
        question: String(q.question).trim(),
        options: q.options.map((o) => String(o)),
        correctAnswer: String(q.correctAnswer || q.options?.[0] || ""),
        explanation: String(q.explanation || ""),
      }));

    if (normalized.length === 10) return normalized;

    throw new Error("Invalid AI response format");
  } catch (error) {
    console.error("Error generating quiz:", error);
    // Provide a safe fallback quiz to keep the flow working
    const fallback = [
      {
        question: "Which HTTP method is idempotent?",
        options: ["POST", "PUT", "PATCH", "CONNECT"],
        correctAnswer: "PUT",
        explanation: "PUT is idempotent by definition; multiple identical requests have the same effect.",
      },
      {
        question: "What does ACID stand for in databases?",
        options: [
          "Atomicity, Consistency, Isolation, Durability",
          "Accuracy, Consistency, Integrity, Durability",
          "Atomicity, Concurrency, Isolation, Distribution",
          "Availability, Consistency, Integrity, Durability",
        ],
        correctAnswer: "Atomicity, Consistency, Isolation, Durability",
        explanation: "These are the transaction guarantees of relational databases.",
      },
      {
        question: "Which data structure gives O(1) average-time lookup?",
        options: ["Array", "Linked List", "Hash Map", "Binary Tree"],
        correctAnswer: "Hash Map",
        explanation: "Hash maps provide average O(1) lookup with a good hash function.",
      },
      {
        question: "What is the purpose of Docker?",
        options: [
          "Virtualize hardware",
          "Containerize applications",
          "Provision cloud servers",
          "Monitor logs",
        ],
        correctAnswer: "Containerize applications",
        explanation: "Docker packages apps and dependencies into containers.",
      },
      {
        question: "Which of the following is NOT part of the CIA triad?",
        options: ["Confidentiality", "Integrity", "Availability", "Authenticity"],
        correctAnswer: "Authenticity",
        explanation: "CIA stands for Confidentiality, Integrity, Availability.",
      },
      {
        question: "In JavaScript, which keyword declares a block-scoped variable?",
        options: ["var", "let", "function", "const"],
        correctAnswer: "let",
        explanation: "Both let and const are block-scoped; let is commonly used for mutable vars.",
      },
      {
        question: "Which index type is best for range queries?",
        options: ["Hash index", "B-Tree index", "Bitmap index", "Full-text index"],
        correctAnswer: "B-Tree index",
        explanation: "B-Trees support ordered traversal and ranges efficiently.",
      },
      {
        question: "What does REST stand for?",
        options: [
          "Representational State Transfer",
          "Remote Execution Service Transport",
          "Reliable Event Streaming Transport",
          "Resource Endpoint Standard Transfer",
        ],
        correctAnswer: "Representational State Transfer",
        explanation: "REST is an architectural style for web services.",
      },
      {
        question: "In Git, which command creates a new branch and switches to it?",
        options: ["git checkout -b", "git switch", "git branch -c", "git new"],
        correctAnswer: "git checkout -b",
        explanation: "'git checkout -b <name>' creates and checks out the branch (or use 'git switch -c').",
      },
      {
        question: "Which algorithm is used by TLS for key exchange by default?",
        options: ["RSA", "Diffie-Hellman", "AES", "SHA-256"],
        correctAnswer: "Diffie-Hellman",
        explanation: "TLS commonly uses (Elliptic Curve) Diffie-Hellman for key exchange.",
      },
    ];
    return fallback;
  }

}

export async function saveQuizResult(questions, answers, score) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const questionResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  // Get wrong answers
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  // Only generate improvement tips if there are wrong answers
  let improvementTip = null;
  if (wrongAnswers.length > 0) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvementPrompt = `
      The user got the following ${user.industry} technical interview questions wrong:

      ${wrongQuestionsText}

      Based on these mistakes, provide a concise, specific improvement tip.
      Focus on the knowledge gaps revealed by these wrong answers.
      Keep the response under 2 sentences and make it encouraging.
      Don't explicitly mention the mistakes, instead focus on what to learn/practice.
    `;

    try {
      const tipResult = await model.generateContent(improvementPrompt);

      improvementTip = tipResult.response.text().trim();
      console.log(improvementTip);
    } catch (error) {
      console.error("Error generating improvement tip:", error);
      // Continue without improvement tip if generation fails
    }
  }

  try {
    const assessment = await db.assessments.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip,
      },
    });

    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

export async function getAssessments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const assessments = await db.assessments.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return assessments;
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Failed to fetch assessments");
  }
}