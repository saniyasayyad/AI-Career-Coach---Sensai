"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { PrismaClient } from "../lib/generated/prisma"; // ✅ correct path
import { redirect } from "next/navigation";
import { generateAiInsights } from "./dashboard";

const db = new PrismaClient();

// Add this at the top after imports
export async function debugDatabaseSave(data) {
  console.log("=== DEBUG: Starting database save ===");
  console.log("Input data:", JSON.stringify(data, null, 2));
  
  try {
    const { userId } = await auth();
    console.log("Auth userId:", userId);
    
    if (!userId) {
      console.log("❌ No userId - auth failed");
      return { error: "No auth" };
    }

    // Test basic database connection
    console.log("Testing database connection...");
    const userCount = await db.user.count();
    console.log("✅ Database connected. User count:", userCount);
    
    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { clerkUserId: userId }
    });
    console.log("Existing user found:", !!existingUser);
    console.log("User ID:", existingUser?.id);
    
    return { 
      success: true, 
      userId, 
      userExists: !!existingUser,
      userDbId: existingUser?.id 
    };
  } catch (error) {
    console.error("❌ Database debug error:", error);
    return { error: error.message };
  }
}

export async function updateUser(data) {
  console.log("=== SIMPLE UPDATE TEST ===");
  console.log("updateUser called with:", data);
  
  const { userId } = await auth();
  
  if (!userId) {
    return { success: false, requiresAuth: true };
  }

  try {
    // Find user first
    let user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });
    
    console.log("User found:", !!user);

    if (!user) {
      // Create user if doesn't exist
      const clerkUser = await currentUser();
      user = await db.user.create({
        data: {
          clerkUserId: userId,
          name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim(),
          imageUrl: clerkUser.imageUrl,
          email: clerkUser.emailAddresses[0].emailAddress,
        },
      });
      console.log("New user created:", user.id);
    }

    // Simple update without transaction
    const processedSkills = Array.isArray(data.skills) ? data.skills : 
      (data.skills && typeof data.skills === 'string') ? 
      data.skills.split(',').map(s => s.trim()).filter(Boolean) : [];

    const updateData = {
      industry: data.industry,
      experience: parseInt(data.experience) || 0,
      bio: data.bio || "",
      skills: processedSkills,
    };

    console.log("Updating with:", updateData);

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: updateData,
    });

    console.log("✅ User updated successfully:", updatedUser.id);
    
    // Verify the update worked
    const verifyUser = await db.user.findUnique({
      where: { id: user.id },
      select: { industry: true, experience: true, skills: true, bio: true }
    });
    
    console.log("✅ Verification - data in DB:", verifyUser);
    
    return { success: true, updatedUser };

  } catch (error) {
    console.error("❌ Update error:", error);
    return { success: false, message: error.message };
  }
}

export async function getUserOnboardingStatus() {
  try {
    const { userId } = await auth();
    if (!userId) {
      redirect("/sign-in");
      return;
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        industry: true,
        experience: true,
        skills: true,
        bio: true,
      },
    });

    if (!user) {
      console.log("User not found in database, redirecting to onboarding");
      return { isOnboarded: false };
    }

    return {
      isOnboarded: !!user.industry,
      user: user,
    };
  } catch (error) {
    console.error("Error fetching user onboarding status:", error);
    return { isOnboarded: false, error: error.message };
  }
}

export async function getUserSalaryInsights() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, message: "Authentication required" };
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      include: {
        salaryInsight: true,
      },
    });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    if (!user.salaryInsight && user.industry) {
      try {
        const salaryData = await generateSalaryInsights(
          user.industry,
          user.experience || 0,
          user.skills || []
        );

        if (salaryData) {
          const newSalaryInsight = await db.salaryInsight.create({
            data: {
              userId: user.id,
              industry: user.industry,
              experience: user.experience || 0,
              ...salaryData,
              lastUpdated: new Date(),
            },
          });

          return { success: true, salaryInsight: newSalaryInsight };
        }
      } catch (error) {
        console.error("Error generating salary insights:", error);
      }
    }

    return {
      success: true,
      salaryInsight: user.salaryInsight,
      hasProfile: !!(user.industry && user.experience !== null),
    };
  } catch (error) {
    console.error("Error fetching salary insights:", error);
    return { success: false, message: "Failed to fetch salary insights" };
  }
}
