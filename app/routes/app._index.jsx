import { json } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  TextField,
  Button,
  Select,
  ChoiceList,
  Text,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Page load hone se pehle data fetch karta hai
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  let settings = await prisma.widgetSettings.findUnique({
    where: { shop },
  });

  if (!settings) {
    settings = await prisma.widgetSettings.create({
      data: {
        shop: shop,
        isEnabled: true,
        buttonStyle: "edge",
        position: "right",
        color: "#00802F",
      },
    });
  }

  return json(settings);
};

// Form submit hone par data save karta hai
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const formData = await request.formData();
  
  // ChoiceList 'isEnabled' ki value array me deta hai, isliye humein isko handle karna hoga
  const isEnabledValue = formData.get("isEnabled") === "true";

  await prisma.widgetSettings.update({
    where: { shop },
    data: {
      isEnabled: isEnabledValue,
      buttonStyle: formData.get("buttonStyle"),
      position: formData.get("position"),
      color: formData.get("color"),
    },
  });

  return json({ message: "Settings saved!" });
};

// UI Component jo screen par dikhta hai
export default function SettingsPage() {
  const settings = useLoaderData();

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card>
            <Form method="post">
              <BlockStack gap="500">
                <Text variant="headingLg" as="h2">
                  Widget Settings
                </Text>

                <ChoiceList
                  title="Widget Status"
                  choices={[
                    { label: "Enable", value: "true" },
                    { label: "Disable", value: "false" },
                  ]}
                  selected={[String(settings.isEnabled)]}
                  name="isEnabled"
                />

                <Select
                  label="Button Style"
                  name="buttonStyle"
                  options={[
                    { label: "Edge Style", value: "edge" },
                    { label: "Circle Style", value: "circle" },
                  ]}
                  defaultValue={settings.buttonStyle}
                />

                <TextField
                  label="Button Color"
                  name="color"
                  type="color"
                  defaultValue={settings.color}
                  autoComplete="off"
                />

                <Select
                  label="Button Position"
                  name="position"
                  options={[
                    { label: "Bottom Right", value: "right" },
                    { label: "Bottom Left", value: "left" },
                  ]}
                  defaultValue={settings.position}
                />

                <Button submit variant="primary">
                  Save Settings
                </Button>
              </BlockStack>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}