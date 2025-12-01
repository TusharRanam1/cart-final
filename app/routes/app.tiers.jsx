// app/routes/app.tiers.jsx

import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  TextField,
  Select,
} from "@shopify/polaris";

const NAMESPACE = "optimaio_cart";
const KEY = "discount_tiers";
const DISCOUNT_FUNCTION_ID = process.env.TIERED_DISCOUNT_FUNCTION_ID; // your Function ID
const DISCOUNT_TITLE = "Optimaio Automatic Tier Discount";

/* ------------------ Helper: Save metafield ------------------ */
async function setMetafield(admin, shopId, key, valueObj) {
  const mutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id namespace key type value }
        userErrors { field message }
      }
    }
  `;
  const variables = {
    metafields: [
      {
        namespace: NAMESPACE,
        key,
        type: "json",
        ownerId: shopId,
        value: JSON.stringify(valueObj),
      },
    ],
  };
  return await admin.graphql(mutation, { variables });
}

/* ------------------ Helper: Ensure Automatic Discount Exists ------------------ */
async function ensureAutomaticDiscountExists(admin) {
  const checkQuery = `
    query {
      discountNodes(first: 50) {
        nodes {
          id
          discount {
            ... on DiscountAutomaticApp {
              title
              status
              appDiscountType {
                appKey
                functionId
              }
            }
          }
        }
      }
    }
  `;

  const res = await admin.graphql(checkQuery);
  const data = await res.json();

  const existing = data?.data?.discountNodes?.nodes?.find(
    (node) =>
      node?.discount?.title === DISCOUNT_TITLE &&
      node?.discount?.appDiscountType?.functionId === DISCOUNT_FUNCTION_ID
  );

  if (existing) {
    console.log("✅ Automatic discount already exists:", existing.id);
    // ✅ Stop here — don’t create again
    return existing.discount;
  }

  // ----------------- Create new one only if not found -----------------
  const createMutation = `
    mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
        automaticAppDiscount {
          discountId
          title
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    automaticAppDiscount: {
      title: DISCOUNT_TITLE,
      functionId: DISCOUNT_FUNCTION_ID,
      discountClasses: ["ORDER", "PRODUCT", "SHIPPING"],
      startsAt: "2025-01-01T00:00:00Z",
      endsAt: "2025-12-31T23:59:59Z",
      combinesWith: {
        orderDiscounts: true,
        productDiscounts: true,
        shippingDiscounts: true,
      },
    },
  };

  const createRes = await admin.graphql(createMutation, { variables });
  const createData = await createRes.json();

  if (createData.data?.discountAutomaticAppCreate?.userErrors?.length) {
    console.error(
      "⚠️ Automatic discount creation errors:",
      createData.data.discountAutomaticAppCreate.userErrors
    );
  } else {
    console.log(
      "✅ Discount created:",
      createData.data.discountAutomaticAppCreate.automaticAppDiscount
    );
  }

  return createData.data.discountAutomaticAppCreate.automaticAppDiscount;
}



/* ------------------ Loader ------------------ */
export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  const query = `
    {
      shop {
        metafield(namespace: "${NAMESPACE}", key: "${KEY}") {
          id
          value
        }
      }
    }
  `;
  const res = await admin.graphql(query);
  const data = await res.json();
  let tiers = [];
  if (data?.data?.shop?.metafield?.value) {
    try {
      tiers = JSON.parse(data.data.shop.metafield.value).tiers || [];
    } catch {
      tiers = [];
    }
  }
  return json({ tiers });
}

/* ------------------ Action ------------------ */
export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  await ensureAutomaticDiscountExists(admin);

  const shopRes = await admin.graphql(`{ shop { id } }`);
  const shopData = await shopRes.json();
  const shopId = shopData.data.shop.id;

  const query = `
    {
      shop {
        metafield(namespace: "${NAMESPACE}", key: "${KEY}") {
          id
          value
        }
      }
    }
  `;
  const existingRes = await admin.graphql(query);
  const existingData = await existingRes.json();
  const existingMetafield = existingData.data.shop.metafield;
  let tiers = [];
  if (existingMetafield?.value) {
    try {
      tiers = JSON.parse(existingMetafield.value).tiers || [];
    } catch {
      tiers = [];
    }
  }

  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "add") {
    const minQty = parseInt(formData.get("minQty"));
    const reward = formData.get("reward");
    const value = formData.get("value");
    if (!minQty || !reward) throw new Error("Invalid input");
    tiers.push({ minQty, reward, value });
  }

  if (actionType === "delete") {
    const index = parseInt(formData.get("index"));
    if (!isNaN(index)) tiers.splice(index, 1);
  }

  await setMetafield(admin, shopId, KEY, { tiers });
  return redirect("/app/tiers");
}

/* ------------------ UI ------------------ */
export default function AdminTiersPage() {
  const { tiers } = useLoaderData();
  const [minQty, setMinQty] = useState("");
  const [reward, setReward] = useState("percentage");
  const [value, setValue] = useState("");

  return (
    <Page title="Automatic Quantity-Based Discounts">
      <Layout>
        {/* Existing Tiers */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Existing Tiers
              </Text>
              {tiers.length === 0 ? (
                <Text>No tiers yet.</Text>
              ) : (
                <ul style={{ listStyle: "none", paddingLeft: 0 }}>
                  {tiers.map((tier, index) => (
                    <li
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <Text>
                        Buy ≥ {tier.minQty} →{" "}
                        {tier.reward === "percentage"
                          ? `${tier.value}% OFF`
                          : tier.reward === "shipping"
                          ? "Free Shipping"
                          : `Free Product (ID: ${tier.value})`}
                      </Text>
                      <Form method="post">
                        <input type="hidden" name="index" value={index} />
                        <input type="hidden" name="actionType" value="delete" />
                        <Button size="slim" tone="critical" submit>
                          Delete
                        </Button>
                      </Form>
                    </li>
                  ))}
                </ul>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Add Tier */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Add New Tier
              </Text>
              <Form method="post">
                <BlockStack gap="300">
                  <TextField
                    label="Minimum Quantity"
                    type="number"
                    name="minQty"
                    value={minQty}
                    onChange={setMinQty}
                  />
                  <Select
                    label="Reward Type"
                    name="reward"
                    value={reward}
                    onChange={setReward}
                    options={[
                      { label: "Percentage Discount", value: "percentage" },
                      { label: "Free Shipping", value: "shipping" },
                      { label: "Free Product", value: "free_product" },
                    ]}
                  />
                  <TextField
                    label="Value"
                    name="value"
                    value={value}
                    onChange={setValue}
                    helpText="Enter % for discount or product ID for gift"
                  />
                  <input type="hidden" name="actionType" value="add" />
                  <Button submit primary>
                    Add Tier
                  </Button>
                </BlockStack>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
