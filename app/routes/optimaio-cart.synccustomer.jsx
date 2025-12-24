import { authenticate } from "../shopify.server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.public.appProxy(request);

    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");

    const body = await request.json();
    let { cartToken, customerId, email } = body;

    // Clean cart token
    const cleanToken = cartToken.split("?")[0];
    const cartKey = cartToken.includes("?key=")
      ? cartToken.split("?key=")[1]
      : null;

    await prisma.cartSession.create({
      data: {
        storeId: shop,
        cartId: cleanToken,
        cartKey,
        customerId,
        email
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Saved cart session",
        cartId: cleanToken,
        cartKey,
        customerId,
        email,
        storeId: shop
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
