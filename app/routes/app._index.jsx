import { json } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Link,
  Button,
  InlineStack,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import appBridge from "@shopify/app-bridge"; // Sahi Import
const { Redirect } = appBridge;              // Sahi Import
import { authenticate } from "../shopify.server";

// Loader function authentication ke liye zaroori hai
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

// UI Component
export default function OverviewPage() {
  const shopify = useAppBridge();

  // Yeh function user ko seedha theme editor ke "App Embeds" section mein le jayega
  const goToAppEmbeds = () => {
    const redirect = Redirect.create(shopify);
    redirect.dispatch(
      Redirect.Action.REMOTE,
      // Yeh Shopify ka special link hai
      { url: `shopify:admin/themes/current/editor?section=app-embeds` }
    );
  };

  return (
    <Page title="Overview">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text variant="headingLg" as="h2">
                Welcome to WhatsApp Chat & Share!
              </Text>
              <Text as="p">
                Follow these simple steps to get the WhatsApp widget live on your store.
              </Text>

              <BlockStack gap="300">
                <Text variant="headingMd" as="h3">Quick Setup Guide</Text>
                <Card subdued>
                  <BlockStack gap="200">
                    <Text>
                      **Step 1: Customize Your Widget** - Go to the{" "}
                      <Link url="/app/customize">Customization Page</Link> to change the look and feel of your button and popup.
                    </Text>
                    <Text>
                      **Step 2: Add Your Contacts** - Add your WhatsApp numbers on the{" "}
                      <Link url="/app/customize">Customization Page</Link> so customers can reach you.
                    </Text>
                     <InlineStack gap="200" blockAlign="center">
                       <Text> **Step 3: Enable Widget in Theme** - Click here to enable the app embed in your theme editor.</Text>
                       {/* Yahan humne onClick event lagaya hai */}
                       <Button variant="primary" onClick={goToAppEmbeds}>Enable in Theme</Button>
                    </InlineStack>
                  </BlockStack>
                </Card>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Analytics Snapshot</Text>
                <Text as="p" tone="subdued">
                  Upgrade to a paid plan to view powerful analytics about your widget usage.
                </Text>
                <Button url="/app/plans">View Plans</Button>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Your Current Plan</Text>
                <Text as="p">Basic (Free Plan)</Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}