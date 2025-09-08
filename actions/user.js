"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "../lib/inngest/prisma";
import { redirect } from "next/navigation";

export async function updateUser(data) {
  const { userId } = auth();
  if (!userId) {
    redirect("/sign-in");
    return;
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  try {
    const result = await db.$transaction(
      async (tx) => {
      
        let industryInsight = await tx.industryInsight.findUnique({
          where: { industry: data.industry },
        });

        if (!industryInsight) {
          industryInsight = await tx.industryInsight.create({
            data: {
              industry: data.industry,
              salaryRanges: [],
              growthRate: 0,
              demandLevel: "Medium",
              topSkills: [],
              marketOutlook: "Neutral",
              keyTrends: [],
              recommendedSkills: [],
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        }

       
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            industry: data.industry,
            experience: data.experience, 
            bio: data.bio,
            skills: data.skills,
          },
        });

        return { updatedUser, industryInsight };
      },
      {
        timeout: 10000,
      }
    );

    return result.updatedUser;
  } catch (error) {
    console.error("Error updating user and industry:", error.message);
    throw new Error("Failed to update profile");
  }
}


export async function getUserOnboardingStatus() {
  const { userId } = auth();
  if (!userId) {
    redirect("/sign-in");
    return;
  }

  try {
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: { industry: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return { isOnboarded: !!user.industry };
  } catch (error) {
    console.error("Error fetching user onboarding status:", error.message);
    throw new Error("Failed to fetch onboarding status");
  }
}