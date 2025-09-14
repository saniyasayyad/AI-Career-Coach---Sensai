import { currentUser } from "@clerk/nextjs/server";
import { db } from "../inngest/prisma";  // use your shared Prisma instance

export const checkUser = async () => {
  // If there is no database URL configured, skip silently
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const user = await currentUser();

  if (!user) {
    return null;
  }

  try {
    // Check if user already exists in DB
    const loggedInUser = await db.user.findUnique({
      where: {
        clerkUserId: user.id,
      },
    });

    if (loggedInUser) {
      return loggedInUser;
    }

    // Create new user if not found
    const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

    const newUser = await db.user.create({
      data: {
        clerkUserId: user.id,
        name,
        imageUrl: user.imageUrl,
        email: user.emailAddresses[0].emailAddress,
      },
    });

    return newUser;
  } catch (error) {
    // Avoid noisy logs in production when DB is unreachable; fail soft
    if (process.env.NODE_ENV !== "production") {
      console.warn("checkUser: database unreachable or query failed:", error.message);
    }
    // Fail softly to avoid breaking the app when DB is unreachable
    return null;
  }
};
