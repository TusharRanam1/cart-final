import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Fetch stored data
  const query = `
    query {
      shop {
        metafield(namespace: "optimaio_cart", key: "cart_settings") {
          value
        }
      }
    }
  `;

  const res = await admin.graphql(query);
  const data = await res.json();

  let settings = {
    theme: "theme1",
    bannerStyle: {},
    colors: {},
    customCSS: "",
    customJS: "",
    zIndex: "auto",
  };

  if (data?.data?.shop?.metafield?.value) {
    try {
      settings = JSON.parse(data.data.shop.metafield.value);
    } catch (e) {
      console.log("⚠ Error parsing saved cart settings", e);
    }
  }

  return json({ settings });
};
