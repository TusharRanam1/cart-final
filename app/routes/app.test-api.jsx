import { json } from "@remix-run/node";
import { useActionData, Form } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
} from "@shopify/polaris";
import { useState } from "react";

export const action = async ({ request }) => {
  const formData = await request.formData();

  const title = formData.get("title");
  const variantBuy = formData.get("variantBuy");
  const variantGet = formData.get("variantGet");

  const { admin } = await authenticate.admin(request);

  // BxGy configuration JSON (variant-level)
  const configuration = {
    discounts: [
      {
        customerBuys: {
          items: {
            productVariants: {
              productVariantsToAdd: [
                `gid://shopify/ProductVariant/${variantBuy}`,
              ],
            },
          },
          value: { quantity: 1 },
        },
        customerGets: {
          items: {
            productVariants: {
              productVariantsToAdd: [
                `gid://shopify/ProductVariant/${variantGet}`,
              ],
            },
          },
          value: {
            discountOnQuantity: {
              quantity: 1,
              effect: { percentage: 1 }, // 100% free
            },
          },
        },
      },
    ],
    discountApplicationStrategy: "FIRST",
  };

  const response = await admin.graphql(
    `#graphql
    mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
        automaticAppDiscount {
          discountId
          title
          status
          appDiscountType {
            appKey
            functionId
          }
          combinesWith {
            orderDiscounts
            productDiscounts
            shippingDiscounts
          }
          discountClasses
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        automaticAppDiscount: {
          title,
          functionId: "0199e0f8-126e-7081-bdc7-9979755074e4",
          startsAt: new Date().toISOString(), // always active
          combinesWith: {
            orderDiscounts: false,
            productDiscounts: false,
            shippingDiscounts: false,
          },
          discountClasses: ["PRODUCT"],
          metafields: [
            {
              namespace: "default",
              key: "function-configuration",
              type: "json",
              value: JSON.stringify(configuration),
            },
          ],
        },
      },
    }
  );

  const jsonResponse = await response.json();
  const result = jsonResponse.data?.discountAutomaticAppCreate;

  if (result?.userErrors?.length) {
    return json({ error: result.userErrors });
  }

  return json({ success: result.automaticAppDiscount });
};

export default function CreateBxGyDiscount() {
  const data = useActionData();

  const [formState, setFormState] = useState({
    title: "Buy X Get Y Free",
    variantBuy: "",
    variantGet: "",
  });

  const handleChange = (field) => (value) =>
    setFormState((prev) => ({ ...prev, [field]: value }));

  return (
    <Page title="Create Buy X Get Y Discount">
      <Layout>
        <Layout.Section>
          {data?.error && (
            <Banner title="Error" status="critical">
              {data.error.map((e, i) => (
                <div key={i}>{e.message}</div>
              ))}
            </Banner>
          )}

          {data?.success && (
            <Banner title="Success" status="success">
              <p>✅ Discount Created Successfully!</p>
              <p>Discount ID: {data.success.discountId}</p>
              <p>Title: {data.success.title}</p>
              <p>Status: {data.success.status}</p>
              <p>Classes: {data.success.discountClasses?.join(", ")}</p>
            </Banner>
          )}
        </Layout.Section>

        <Layout.Section>
          <Card sectioned>
            <Form method="post">
              <FormLayout>
                <TextField
                  label="Discount Title"
                  name="title"
                  value={formState.title}
                  onChange={handleChange("title")}
                  requiredIndicator
                />

                <TextField
                  label="Variant to Buy (Variant ID)"
                  name="variantBuy"
                  value={formState.variantBuy}
                  onChange={handleChange("variantBuy")}
                  placeholder="e.g. 47318999990427"
                  requiredIndicator
                />

                <TextField
                  label="Variant to Get (Variant ID)"
                  name="variantGet"
                  value={formState.variantGet}
                  onChange={handleChange("variantGet")}
                  placeholder="e.g. 47317586313371"
                  requiredIndicator
                />

                <Button submit primary>
                  Create Discount
                </Button>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
