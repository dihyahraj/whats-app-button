import { useState, useCallback } from "react";
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
  Modal,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Page load hone se pehle data fetch karta hai
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  let settings = await prisma.widgetSettings.findUnique({
    where: { shop },
    include: { contacts: { orderBy: { createdAt: 'asc' } } }, // Contacts ko bhi fetch karega
  });

  if (!settings) {
    // Agar settings nahi hain to default bana dega
    const newSettings = await prisma.widgetSettings.create({
      data: {
        shop: shop,
        isEnabled: true,
        buttonStyle: "edge",
        position: "right",
        color: "#25D366",
      },
    });
    // Hum yahan empty contacts add kar rahe hain taake data ka structure same rahe
    settings = { ...newSettings, contacts: [] };
  }

  return json(settings);
};

// Form submit hone par data save karta hai
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const formData = await request.formData();
  const intent = formData.get("intent");

  // Plan: Basic, Contacts: 2
  const CONTACT_LIMIT = 2;

  // Widget settings save karne ka action
  if (intent === "save_settings") {
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
  }

  // Naya contact banane ka action
  if (intent === "create_contact") {
    const currentSettings = await prisma.widgetSettings.findUnique({
      where: { shop },
      include: { contacts: true },
    });

    if (currentSettings.contacts.length >= CONTACT_LIMIT) {
       return json({ error: "Contact limit reached for Basic plan." }, { status: 403 });
    }

    await prisma.contact.create({
      data: {
        name: formData.get("name"),
        subtitle: formData.get("subtitle"),
        number: formData.get("number"),
        displayTime: formData.get("displayTime"),
        startTime: formData.get("startTime"),
        endTime: formData.get("endTime"),
        settingsId: currentSettings.id,
      },
    });
    return json({ message: "Contact created!" });
  }
  
  // Contact delete karne ka action
  if (intent === "delete_contact") {
    const contactId = parseInt(formData.get("contactId"), 10);
    // Safety check: ensure the contact belongs to the shop before deleting
    const contact = await prisma.contact.findFirst({
        where: {
            id: contactId,
            settings: {
                shop: shop,
            },
        },
    });

    if (contact) {
        await prisma.contact.delete({ where: { id: contactId } });
        return json({ message: "Contact deleted!" });
    } else {
        return json({ error: "Contact not found or does not belong to this shop." }, { status: 404 });
    }
  }

  return json({ error: "Invalid intent" }, { status: 400 });
};

// UI Component
export default function CustomizePage() {
  const settings = useLoaderData();
  const { contacts } = settings;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleModal = useCallback(() => setIsModalOpen((active) => !active), []);

  // Plan: Basic, Contacts: 2
  const contactLimit = 2;
  const canAddContact = contacts.length < contactLimit;

  // General Widget Settings Form
  const settingsMarkup = (
    <Card>
      <Form method="post">
        <input type="hidden" name="intent" value="save_settings" />
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
  );

  // Contacts Management Section
  const contactsMarkup = (
    <Card>
      <BlockStack gap="500">
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="headingLg" as="h2">Manage Contacts</Text>
          <Button onClick={toggleModal} disabled={!canAddContact}>
            Add Contact
          </Button>
        </InlineStack>

        {!canAddContact && (
          <Text tone="critical">
            You have reached your limit of {contactLimit} contacts for the Basic plan.
          </Text>
        )}

        {contacts.length === 0 ? (
          <Text as="p">
            No contacts added yet. Click 'Add Contact' to get started.
          </Text>
        ) : (
          <BlockStack gap="300">
            {contacts.map((contact) => (
              <Card key={contact.id}>
                <InlineStack align="space-between" blockAlign="center" wrap={false}>
                  <BlockStack gap="100">
                    <Text variant="headingMd">{contact.name}</Text>
                    <Text tone="subdued">{contact.subtitle}</Text>
                    <Text as="p">
                      Number: {contact.number} | Timings: {contact.displayTime}
                    </Text>
                  </BlockStack>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete_contact" />
                    <input type="hidden" name="contactId" value={contact.id} />
                    <Button submit variant="primary" tone="critical">
                      Delete
                    </Button>
                  </Form>
                </InlineStack>
              </Card>
            ))}
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );

  // Modal (Popup) for Adding a New Contact
  const addContactModal = (
    <Modal
      open={isModalOpen}
      onClose={toggleModal}
      title="Add a new contact"
      primaryAction={{
        content: "Add Contact",
        onAction: () =>
          document
            .getElementById("addContactForm")
            .dispatchEvent(
              new Event("submit", { cancelable: true, bubbles: true })
            ),
      }}
    >
      <Modal.Section>
        <Form method="post" id="addContactForm" onSubmit={toggleModal}>
          <input type="hidden" name="intent" value="create_contact" />
          <BlockStack gap="300">
            <TextField
              label="Name (e.g., Sales Team)"
              name="name"
              autoComplete="off"
              required
            />
            <TextField
              label="Subtitle (e.g., For new orders)"
              name="subtitle"
              autoComplete="off"
            />
            <TextField
              label="WhatsApp Number (with country code)"
              name="number"
              type="tel"
              autoComplete="off"
              required
            />
            <TextField
              label="Display Timings (e.g., 10am - 7pm)"
              name="displayTime"
              autoComplete="off"
            />
            <TextField
              label="Start Time (24h format, e.g., 10:00)"
              name="startTime"
              autoComplete="off"
            />
            <TextField
              label="End Time (24h format, e.g., 19:00)"
              name="endTime"
              autoComplete="off"
            />
          </BlockStack>
        </Form>
      </Modal.Section>
    </Modal>
  );

  return (
    <Page title="Customize Widget">
      <Layout>
        <Layout.Section>
          {settingsMarkup}
        </Layout.Section>
        <Layout.Section>
          {contactsMarkup}
        </Layout.Section>
      </Layout>
      {addContactModal}
    </Page>
  );
}