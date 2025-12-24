import {
  BlockStack,
  Divider,
  Page,
  Tabs,
  Layout,
  Card,
  Button,
  InlineStack,
  Text,
  Box,
  Frame,
  Toast,
} from "@shopify/polaris";
import { ArrowLeftIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { useState, useCallback } from "react";
import { useNavigate } from "@remix-run/react";


// Loader: makes sure the request is authenticated
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function AppIndexPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(0);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("cart-goals"); // 👈 added state

  const toggleToast = useCallback(() => setToastActive(false), []);
  const handleTabChange = useCallback(
    (selectedTabIndex) => setSelected(selectedTabIndex),
    []
  );

  const tabs = [
    { id: "all", content: "All" },
    { id: "offers", content: "Offers" },
    { id: "messaging", content: "Messaging" },
    { id: "cart-rules", content: "Cart rules" },
  ];

  // 🧩 Campaign content map
 const campaignData = {
  "cart-goals": {
    title: "Cart goals",
    description:
      "Offer free gifts, order discounts or free shipping when cart value reaches milestones shown on a progress bar.",
    image: "/campaign-banner-cart-goal.svg",
    stats: [
      { value: "Upto 6%", label: "Potential AOV boost" },
      { value: "5-10 mins", label: "Time to set up" },
    ],
  },
  bxgy: {
    title: "Buy X Get Y",
    description:
      "Create promotional offers that give free or discounted items when customers purchase qualifying products.",
    image: "/campaign-banner-bxgy.svg",
    stats: [
      { value: "Upto 9%", label: "Potential sales lift" },
      { value: "3-8 mins", label: "Time to set up" },
    ],
  },
};



  const currentCampaign = campaignData[selectedCampaign];

  return (
    <Frame>
      <Page
        title={
          <InlineStack gap="500" blockAlign="center">
            <Button
              icon={ArrowLeftIcon}
              plain
              onClick={() => window.history.back()}
            />
            <Text variant="headingLg" as="h2">
              Select a campaign type
            </Text>
          </InlineStack>
        }
      >
        <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange}>
          <div style={{ padding: "16px" }}>
            <Text variant="bodyMd" fontWeight="medium">
              Content for {tabs[selected].content}
            </Text>
          </div>
        </Tabs>

        <Layout>
          {/* ---------- LEFT SIDE ---------- */}
     <Layout.Section variant="oneThird">
  <BlockStack gap="400">
    {/* Card 1 - Cart Goals */}
    <Box
      onClick={() => setSelectedCampaign("cart-goals")}
      borderWidth="025"
      borderColor={
        selectedCampaign === "cart-goals" ? "border-selected" : "border"
      }
      borderRadius="300"
      background={
        selectedCampaign === "cart-goals" ? "bg-surface-active" : "bg-surface"
      }
      shadow={selectedCampaign === "cart-goals" ? "base" : undefined}
      cursor="pointer"
      padding="0"
      hover="bg-surface-hover"
    >
      <Card sectioned>
        <InlineStack gap="400" blockAlign="center">
          <Box width="40px" height="40px" display="flex" alignItems="center">
            <img
              src="/cart-goal.svg"
              alt="Cart goal icon"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          </Box>
          <Box>
            <Text variant="headingMd" as="h3">
              Cart goals
            </Text>
            <Text variant="bodyMd" tone="subdued">
              Give rewards based on cart value.
            </Text>
          </Box>
        </InlineStack>
      </Card>
    </Box>

    {/* Card 2 - BXGY */}
    <Box
      onClick={() => setSelectedCampaign("bxgy")}
      borderWidth="025"
      borderColor={
        selectedCampaign === "bxgy" ? "border-selected" : "border"
      }
      borderRadius="300"
      background={
        selectedCampaign === "bxgy" ? "bg-surface-active" : "bg-surface"
      }
      shadow={selectedCampaign === "bxgy" ? "base" : undefined}
      cursor="pointer"
      padding="0"
      hover="bg-surface-hover"
    >
      <Card sectioned>
        <InlineStack gap="400" blockAlign="center">
          <Box width="40px" height="40px" display="flex" alignItems="center">
            <img
              src="/icon-bxgy.svg"
              alt="Buy x Get y"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          </Box>
          <Box>
            <Text variant="headingMd" as="h3">
              Buy x Get y
            </Text>
            <Text variant="bodyMd" tone="subdued">
              Give rewards based on product.
            </Text>
          </Box>
        </InlineStack>
      </Card>
    </Box>

  </BlockStack>
</Layout.Section>






          {/* ---------- RIGHT SIDE ---------- */}
          <Layout.Section>
            <Box paddingBlockEnd="600">
              <Card title={currentCampaign.title} sectioned>
                <div style={{ textAlign: "center" }}>
                  <img
                    src={currentCampaign.image}
                    alt={currentCampaign.title}
                    style={{ width: "400px", height: "200px" }}
                  />

                  <Box padding="400">
                    <BlockStack gap="400" align="center">
                      <Text variant="headingMd" as="h2">
                        {currentCampaign.title}
                      </Text>
                      <Text variant="bodyMd" tone="subdued" alignment="center">
                        {currentCampaign.description}
                      </Text>

                    <Button
  primary
  onClick={async () => {
    const endpoint =
      selectedCampaign === "bxgy"
        ? "/api/create-bxgy-discount"
        : "/api/create-campaign";

    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();

      if (data.ok) {
        // Show toast
        setToastMessage(
          `✅ Created: ${data.campaign.campaignName} (status: ${data.campaign.status})`
        );
        setToastActive(true);

        // ⏳ Wait shortly so user can see toast (optional)
        setTimeout(() => {
          navigate("/app/my-campaigns");
        }, 800);

        return;
      } else {
        setToastMessage("❌ Error creating campaign");
      }
    } catch (err) {
      console.error("Error creating campaign:", err);
      setToastMessage("⚠️ Something went wrong while creating the campaign");
    }

    setToastActive(true);
  }}
>
  Create this campaign
</Button>

                    </BlockStack>
                  </Box>
                </div>

                <Divider borderColor="border" />

               <Box paddingBlockStart="400">
  <InlineStack gap="400" align="center">
    {currentCampaign.stats.map((stat, index) => (
      <Box
        key={index}
        padding="400"
        borderWidth="025"
        borderRadius="300"
        background="bg-surface"
        minWidth="200px"
      >
        <BlockStack gap="100" align="center">
          <Text variant="heading2xl" as="h3" alignment="center">
            {stat.value}
          </Text>
          <Text variant="bodySm" tone="subdued" alignment="center">
            {stat.label}
          </Text>
        </BlockStack>
      </Box>
    ))}
  </InlineStack>
</Box>

              </Card>
            </Box>
          </Layout.Section>
        </Layout>
      </Page>

      {toastActive && <Toast content={toastMessage} onDismiss={toggleToast} />}
    </Frame>
  );
}
