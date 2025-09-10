"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "../lib/inngest/prisma";
import { redirect } from "next/navigation";

export async function updateUser(data) {
   console.log("updateUser called with:", data);
  const { userId } = await auth(); // Add await here

   console.log("Auth userId:", userId);
   
   // Validate input data
   console.log("Validating input data:", {
     industryProvided: !!data.industry,
     industryType: typeof data.industry,
     experienceProvided: !!data.experience,
     experienceType: typeof data.experience,
     skillsProvided: !!data.skills,
     skillsType: typeof data.skills,
     skillsIsArray: Array.isArray(data.skills),
     skillsLength: Array.isArray(data.skills) ? data.skills.length : 'N/A'
   });
   
   if (!data) {
     console.error("No data provided");
     return { success: false, message: "No data provided" };
   }
   
   if (!data.industry) {
     console.error("Missing required field: industry");
     return { success: false, message: "Industry is required" };
   }
  
  if (!userId) {
    console.error("No userId found in auth()");
    return { success: false, requiresAuth: true, message: "Authentication expired. Please sign in again." };
  }

  let user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  // If user doesn't exist, create them
  if (!user) {
    try {
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return { success: false, requiresAuth: true, message: "Authentication expired. Please sign in again." };
      }

      const name = `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim();
      
      user = await db.user.create({
        data: {
          clerkUserId: userId,
          name,
          imageUrl: clerkUser.imageUrl,
          email: clerkUser.emailAddresses[0].emailAddress,
        },
      });
    } catch (error) {
      console.error("Error creating user:", error);
      return { success: false, message: "Failed to create user account. Please try again." };
    }
  }

  try {
    console.log("Starting database transaction");
    const result = await db.$transaction(
      async (tx) => {
        console.log("Looking for industry insight:", data.industry);
        let industryInsight = null;
        
        if (data.industry) {
          industryInsight = await tx.industryInsight.findUnique({
            where: { industry: data.industry },
          });
          
          console.log("Industry insight found:", !!industryInsight);
  
          if (!industryInsight) {
            console.log("Creating new industry insight for:", data.industry);
            try {
              industryInsight = await tx.industryInsight.create({
                data: {
                  industry: data.industry,
                  salaryRanges: [],
                  growthRate: 0,
                  demandLevel: "MEDIUM",
                  topSkills: [],
                  marketOutlook: "NEUTRAL",
                  keyTrends: [],
                  recommendedSkills: [],
                  nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
              });
              console.log("Industry insight created successfully");
            } catch (createError) {
              console.error("Error creating industry insight:", createError);
              throw createError; // Re-throw to be caught by the outer catch
            }
          }
        } else {
          console.log("No industry provided, skipping industry insight creation");
        }

        console.log("Updating user with ID:", user.id);
        
        // Process skills before update
        const processedSkills = Array.isArray(data.skills) ? data.skills : 
                    (data.skills && typeof data.skills === 'string') ? 
                    data.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
        
        console.log("Processed skills for update:", processedSkills);
        
        // Prepare update data
        const updateData = {
          industry: data.industry,
          experience: parseInt(data.experience) || 0, 
          bio: data.bio || "",
          skills: processedSkills,
        };
        
        console.log("User update data:", updateData);
        
        try {
          const updatedUser = await tx.user.update({
            where: { id: user.id },
            data: updateData,
          });
          
          console.log("User updated successfully:", updatedUser.id);
          return { updatedUser, industryInsight };
        } catch (updateError) {
          console.error("Error updating user:", updateError);
          throw updateError; // Re-throw to be caught by the outer catch
        }
      },
      {
        timeout: 30000,
      }
    );

    console.log("Transaction completed successfully, returning result:", result);
    return { success: true, ...result };
  } catch (error) {
    console.error("Error updating user and industry:", error);
    
    // Handle specific database errors
    if (error.code === 'P2002') {
      return { success: false, message: "A user with this information already exists" };
    }
    
    if (error.code === 'P2025') {
      return { success: false, message: "User not found" };
    }
    
    // Handle validation errors
    if (error.code === 'P2003') {
      return { success: false, message: "Invalid data provided" };
    }
    
    return { success: false, message: "Failed to update profile. Please try again." };
  }
}

export async function getUserOnboardingStatus() {
  try {
    const { userId } = await auth(); // Add await here too
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
      console.log("User not found in database, redirecting to onboarding");
      return { isOnboarded: false };
    }

    return { isOnboarded: !!user.industry };
  } catch (error) {
    console.error("Error fetching user onboarding status:", error.message);
    return { isOnboarded: false, error: error.message };
  }
  } catch (authError) {
    console.error("Authentication error in getUserOnboardingStatus:", authError);
    redirect("/sign-in");
    return;
  }
}