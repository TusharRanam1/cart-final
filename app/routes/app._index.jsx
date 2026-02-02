import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  InlineStack,
  BlockStack,
  Box,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useNavigate } from "@remix-run/react";
import { useState, useEffect } from "react";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function AppIndexPage() {
  const navigate = useNavigate();

  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!showToast) return;

    const timer = setTimeout(() => {
      setShowToast(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [showToast]);

  return (
    <Page>
      <Box paddingBlockEnd="600">
        <Layout>
          <Layout.Section>
            <Card padding="600">
              <Box
                background="bg-surface-secondary"
                borderRadius="300"
                padding="300"
              >
                <InlineStack align="center" wrap>
                  {/* Image */}

                  <InlineStack align="center">
                    <img
                      src="/campaign-banner-cart-goal.svg"
                      alt="Cart goal illustration"
                      style={{ height: "150px" }}
                    />
                  </InlineStack>

                  {/* Right content (UNCHANGED STRUCTURE) */}
                  <Layout.Section variant="oneThird">
                    <BlockStack gap="400" inlineAlign="center">
                      <Text variant="headingMd" as="h2">
                        Offer gifts based on purchase milestones
                      </Text>

                      <Text variant="bodyMd" tone="subdued">
                        Create a campaign that offers gifts to customers based
                        on their purchase milestones. For example, offer a free
                        gift when a customer spends $100.
                      </Text>

                      <InlineStack>
                        <Box maxWidth="240px" width="100%">
                          <Button
                            variant="primary"
                            fullWidth
                            size="slim"
                            onClick={() => navigate("/app/create-campaign")}
                          >
                            Create a Cart goal campaign
                          </Button>
                        </Box>
                      </InlineStack>
                    </BlockStack>
                  </Layout.Section>
                </InlineStack>
              </Box>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <InlineStack gap="400" align="stretch" wrap={false}>
              {/* Card 1 */}
              <Box width="100%" style={{ flex: 1 }}>
                <Card padding="400">
                  <BlockStack gap="300" inlineAlign="center">
                    <img
                      src="index-page/home-call.svg"
                      alt="Help"
                      style={{ height: 48 }}
                    />

                    <Text variant="headingSm" as="h3">
                      Need help?
                    </Text>

                    <Text tone="subdued" alignment="center">
                      Need help with setup? Have questions? Ping us in chat and
                      we’ll be happy to help.
                    </Text>
                    <Button
                      size="slim"
                      fullWidth
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          "support@optimaio.com",
                        );
                        setShowToast(true);
                      }}
                    >
                      Copy support email
                    </Button>

                    {showToast && (
                      <Banner
                        tone="success"
                        onDismiss={() => setShowToast(false)}
                      >
                        Support email copied to clipboard
                      </Banner>
                    )}
                  </BlockStack>
                </Card>
              </Box>

              {/* Card 2 */}
              <Box width="100%" style={{ flex: 1 }}>
                <Card padding="400">
                  <BlockStack gap="300" inlineAlign="center">
                    <img
                      src="index-page/home-chat.svg"
                      alt="Schedule demo"
                      style={{ height: 48 }}
                    />

                    <Text variant="headingSm" as="h3">
                      Schedule a demo
                    </Text>

                    <Text tone="subdued" alignment="center">
                      Learn best practices to boost your average order value
                      using CornerCart.
                    </Text>

                    <Button
                      size="slim"
                      fullWidth
                      url="https://optimaio.com/pages/contact"
                      target="_blank"
                    >
                      Schedule a call
                    </Button>
                  </BlockStack>
                </Card>
              </Box>

              {/* Card 3 */}
              {/* <Box width="100%" style={{ flex: 1 }}>
                <Card padding="400">
                  <BlockStack gap="300" inlineAlign="center">
                    <img
                      src="index-page/home-slack.svg"
                      alt="Slack"
                      style={{ height: 48 }}
                    />

                    <Text variant="headingSm" as="h3">
                      Join our Slack channel
                    </Text>

                    <Text tone="subdued" alignment="center">
                      Get direct access to our development team by joining our
                      dedicated Slack channel.
                    </Text>

                    <Button size="slim" fullWidth>
                      Join us on Slack
                    </Button>
                  </BlockStack>
                </Card>
              </Box> */}
            </InlineStack>
          </Layout.Section>
        </Layout>
      </Box>
    </Page>
  );
}
