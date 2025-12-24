import { authenticate } from "../shopify.server";
import { Box, InlineGrid, Page, Text, Button, BlockStack,InlineStack} from "@shopify/polaris";
import SettingsLeftCard from "./components/SettingsLeftCard";
import SettingsRightCard from "./components/SettingsRightCard";
import { useNavigate } from "@remix-run/react";
import { ArrowLeftIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function AppSettingsPage() {
    const navigate = useNavigate();

  return (
    <Page padding="400"  title={
          <InlineStack gap="500" blockAlign="center">
            <Button
              icon={ArrowLeftIcon}
              plain
              onClick={() => window.history.back()}
            />
            <Text variant="headingLg" as="h2">
              Settings
            </Text>
          </InlineStack>
        } >
      <Box padding="400">
        <InlineGrid columns={{ xs: 1, md: "1fr 2fr" }} gap="400">
          {/* Plan */}
          {/* Left Section */}
          <SettingsLeftCard
            title="Account settings"
            description="Manage your account settings."
          />

          {/* Right section */}
<SettingsRightCard
  title="Your current plan"
  description="Upgrade or downgrade to any plan we offer using the settings given below."
>
  <InlineStack
    align="space-between"
    blockAlign="center"
    wrap={false}
  >
    {/* LEFT — Plan info */}
    <InlineStack gap="200" align="center">
      <Text tone="subdued">
        Free plan :
      </Text>

      <Text variant="headingMd" as="h3">
        Basic plan
      </Text>
    </InlineStack>

    {/* RIGHT — Action */}
 <Button
  variant="primary"
  onClick={() => navigate("/app/pricing")}
>
  Upgrade plan
</Button>

  </InlineStack>
</SettingsRightCard>


        </InlineGrid>
      </Box>
    </Page>
  );
}
