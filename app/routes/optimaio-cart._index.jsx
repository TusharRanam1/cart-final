import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.public.appProxy(request);

  return json({
    route: "root",
    message: "Root proxy route"
  });
};
