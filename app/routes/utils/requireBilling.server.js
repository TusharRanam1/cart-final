import { redirect } from "@remix-run/node";

export async function requireBilling({ admin, session }) {
  const query = `
    query {
      currentAppInstallation {
        activeSubscriptions {
          id
          status
        }
      }
    }
  `;

  const res = await admin.graphql(query);
  const data = await res.json();

  const subscription = data.data.currentAppInstallation.activeSubscriptions[0];

  if (!subscription || subscription.status !== "ACTIVE") {
    throw redirect(`/app/pricing?shop=${session.shop}&host=${session.host}`);
  }

  return subscription;
}
