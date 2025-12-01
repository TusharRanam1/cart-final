import { authenticate } from "../shopify.server";
import { useState } from "react";
import {
  Card,
  Text,
  Button,
  Box,
  InlineGrid,
  Banner,
  Page,
} from "@shopify/polaris";
import CurrencyManager from "./components/CurrencyManager";
import  SettingsLeftCard from "./components/SettingsLeftCard";
import SettingsRightCard from "./components/SettingsRightCard";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function AppSettingsPage() {
  return (
    <Page padding="400">
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
      
        </SettingsRightCard>


        {/* Currency Setting */}
        {/* Left section */}
        <SettingsLeftCard
          title="Currency settings"
          description="Manage your currency formats used in the storefront."
        />

        {/* Right section */}
        <SettingsRightCard
          title="Manage Currencies"
          description="This language will be the default language (select any from the list above) the app uses to initialise the widgets"
        >
          <CurrencyManager />
        </SettingsRightCard>
      </InlineGrid>
    </Box>
    </Page>
  );
}
