import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loader = () =>
  Response.json({ message: "👋 Webhook endpoint: POST only." });

export const action = async ({ request }) => {
  const { topic, payload, session, shop } = await authenticate.webhook(request);

  if (!session) {
    console.warn("⚠️ No active session found. Shop may have uninstalled.");
    return new Response();
  }

    console.log("-------=====Webhook topic received update:", topic);
  if (topic === "CARTS_UPDATE") {
    console.log("🛒 Full Cart Webhook Data:");
    console.log(JSON.stringify(payload, null, 2));

    // -----------------------------
    // Extract Analytics Data
    // -----------------------------
    const cartId = payload.id;
    const storeId = shop;                           // e.g. mystore.myshopify.com
    const customerId = payload.buyerIdentity;

    console.log("📊 Analytics Data:");
    console.log("Store ID:", storeId);
    console.log("Cart ID:", cartId);
    console.log("Customer ID:", customerId);
    console.log("Extra Data",JSON.stringify(payload.buyerIdentity, null, 2));


    try {
      await prisma.cartEvent.create({
        data: {
          cartId,
          storeId,
          customerId,
          eventType: "CARTS_UPDATE",
          payload,
        },
      });

      console.log("✅ Saved analytics data to DB! Using CARTS_UPDATE webhook.");
    } catch (err) {
      console.error("❌ DB Save Error:", err);
    }
  }

  return new Response("ok");
};
