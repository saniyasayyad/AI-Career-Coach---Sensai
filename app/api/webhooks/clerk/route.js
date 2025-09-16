import { Webhook } from "svix";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";

export async function POST(req) {
  // Verify webhook signature
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  const body = await req.text();

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
  }

  const wh = new Webhook(webhookSecret);

  let evt;
  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    return new Response("Invalid signature", { status: 400 });
  }

  const eventType = evt.type;
  const data = evt.data;

  try {
    if (eventType === "user.created") {
      const clerkUserId = data.id;
      const email = data.email_addresses?.[0]?.email_address || null;
      const firstName = data.first_name || "";
      const lastName = data.last_name || "";
      const imageUrl = data.image_url || null;
      const name = `${firstName} ${lastName}`.trim();

      await db.user.upsert({
        where: { clerkUserId },
        create: {
          clerkUserId,
          name,
          email,
          imageUrl,
        },
        update: {
          name,
          email,
          imageUrl,
        },
      });
    }

    if (eventType === "user.deleted") {
      const clerkUserId = data.id;
      await db.user.deleteMany({ where: { clerkUserId } });
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Clerk webhook error:", error);
    }
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}


