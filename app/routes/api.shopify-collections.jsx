import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    const shop = session.shop;

    console.log(`🗂️ Fetching collections for shop: ${shop}`);

    const gql = `
      query {
        collections(first: 50) {
          edges {
            node {
              id
              title
              handle
              image {
                url
                altText
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(gql);
    const data = await response.json();

    if (!data?.data?.collections?.edges) {
      console.error("❌ GraphQL error:", data.errors);
      return new Response(
        JSON.stringify({ success: false, error: "GraphQL error", details: data.errors }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }

    const collections = data.data.collections.edges.map(({ node }) => ({
      id: node.id,
      title: node.title,
      handle: node.handle,
      image: node.image
        ? {
            url: node.image.url,
            alt: node.image.altText || node.title,
          }
        : {
            url:
              "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-collection.png",
            alt: "No image available",
          },
    }));

    return new Response(
      JSON.stringify({ success: true, collections }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Loader failed:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
};
