import { useState, useCallback } from "react";
import { json, redirect } from "@remix-run/node";
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
  Banner,
} from "@shopify/polaris";

// Phone Number library ke liye imports
import PhoneInput from 'react-phone-number-input';
import { CustomPhoneNumberInput } from 'react-phone-number-input-style';
// Inki CSS ko aapko app/root.jsx mein import karna hoga
// import 'react-phone-number-input/style.css'
// import 'react-phone-number-input-style/style.css'

import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Page load hone par data fetch karta hai
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  let settings = await prisma.widgetSettings.findUnique({
    where: { shop },
    include: { contacts: { orderBy: { createdAt: 'asc' } } },
  });

  if (!settings) {
    const newSettings = await prisma.widgetSettings.create({
      data: {
        shop: shop,
        isEnabled: true,
        buttonStyle: "edge",
        position: "right",
        color: "#25D366",
        plan: "BASIC", // Default plan
      },
    });
    settings = { ...newSettings, contacts: [] };
  }
  return json(settings);
};

// Form submit hone par data save karta hai (ab yeh mukammal hai)
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const formData = await request.formData();
  const intent = formData.get("intent");
  
  const currentSettings = await prisma.widgetSettings.findUnique({ where: { shop }, include: { contacts: true } });
  
  // Basic Plan ke liye contact limit
  const CONTACT_LIMIT = 2;

  // --- WIDGET SETTINGS SAVE KARNE KI LOGIC ---
  if (intent === "save_settings") {
    await prisma.widgetSettings.update({
      where: { shop },
      data: {
        isEnabled: formData.get("isEnabled") === "true",
        buttonStyle: formData.get("buttonStyle"),
        position: formData.get("position"),
        color: formData.get("color"),
      },
    });
    return redirect('/app/customize');
  }

  // --- NAYA CONTACT BANANE KI LOGIC ---
  if (intent === "create_contact") {
    if (currentSettings.contacts.length >= CONTACT_LIMIT) {
       return json({ error: "Contact limit reached for Basic plan." }, { status: 403 });
    }
    await prisma.contact.create({
      data: {
        name: formData.get("name"),
        subtitle: formData.get("subtitle"),
        number: formData.get("number"),
        displayTime: "Available 24/7", // Default value
        startTime: "00:00",
        endTime: "23:59",
        settingsId: currentSettings.id,
      },
    });
    return redirect('/app/customize');
  }
  
  // --- CONTACT DELETE KARNE KI LOGIC ---
  if (intent === "delete_contact") {
    const contactId = parseInt(formData.get("contactId"), 10);
    const contact = await prisma.contact.findFirst({ where: { id: contactId, settings: { shop } } });
    if (contact) {
        await prisma.contact.delete({ where: { id: contactId } });
    }
    return redirect('/app/customize');
  }

  return json({ error: "Invalid intent" }, { status: 400 });
};

// UI Component (Ab yeh Functional hai)
export default function CustomizePage() {
  const settings = useLoaderData();
  const { contacts, plan } = settings;
  
  // Main settings form ke liye state
  const [formState, setFormState] = useState(settings);
  // Modal ke liye state
  const [modalFormState, setModalFormState] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Jab bhi koi field change ho, to state update karein
  const handleSettingsChange = useCallback((value, id) => {
    setFormState((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleModalChange = useCallback((value, id) => {
    setModalFormState(prev => ({ ...prev, [id]: value }));
  }, []);

  const toggleModal = useCallback(() => {
    setModalFormState({}); // Modal band/khulne par state reset karein
    setIsModalOpen((active) => !active);
  }, []);

  // Is plan ko 'dynamic' banana hamara agla kaam hoga
  const currentPlanFeatures = {
      contacts: 2, 
      advancedPositioning: false, 
      popupCustomization: 'none', 
      automations: false
  };
  const canAddContact = contacts.length < currentPlanFeatures.contacts;

  const LockedFeatureBanner = ({ children, requiredPlan }) => (
    <Banner tone="info">
      {children} Upgrade to the {requiredPlan} plan to use this feature.
      <div style={{marginTop: '8px'}}><Button variant="plain" url="/app/plans">View Plans</Button></div>
    </Banner>
  );

  return (
    <Page title="Customize Widget">
      <Layout>
        {/* --- Left Column --- */}
        <Layout.Section>
            <Card>
                <Form method="post">
                <input type="hidden" name="intent" value="save_settings" />
                <BlockStack gap="500">
                    <Text variant="headingLg" as="h2">Appearance & Positioning</Text>
                    <ChoiceList title="Widget Status" choices={[{ label: "Enable", value: "true" }, { label: "Disable", value: "false" }]} selected={[String(formState.isEnabled)]} onChange={(v) => handleSettingsChange(v, 'isEnabled')} name="isEnabled" />
                    <Select label="Button Style" options={[{ label: "Edge Style", value: "edge" }, { label: "Circle Style", value: "circle" }]} value={formState.buttonStyle} onChange={(v) => handleSettingsChange(v, 'buttonStyle')} name="buttonStyle" />
                    <TextField label="Button Color" type="color" value={formState.color} onChange={(v) => handleSettingsChange(v, 'color')} name="color" autoComplete="off" />
                    
                    <Select label="Button Position" options={[{ label: "Bottom Right", value: "right" }, { label: "Bottom Left", value: "left" }]} value={formState.position} onChange={(v) => handleSettingsChange(v, 'position')} name="position" />
                    {!currentPlanFeatures.advancedPositioning && (<LockedFeatureBanner requiredPlan="Pro">Unlock advanced X/Y positioning.</LockedFeatureBanner>)}

                    <Button submit variant="primary">Save Appearance</Button>
                </BlockStack>
                </Form>
            </Card>

            <div style={{marginTop: '20px'}}>
                <Card>
                    <BlockStack gap="300">
                        <Text variant="headingLg" as="h2">Popup Customization</Text>
                        {!currentPlanFeatures.popupCustomization && (<LockedFeatureBanner requiredPlan="Pro">Customize the popup window.</LockedFeatureBanner>)}
                    </BlockStack>
                </Card>
            </div>
        </Layout.Section>
        
        {/* --- Right Column --- */}
        <Layout.Section>
            <Card>
                <BlockStack gap="500">
                    <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingLg" as="h2">Manage Contacts</Text>
                    <Button onClick={toggleModal} disabled={!canAddContact}>Add Contact</Button>
                    </InlineStack>
                    {!canAddContact && (<Banner tone="critical">You have reached your limit of {currentPlanFeatures.contacts} contacts for the {plan} plan.</Banner>)}
                    {contacts.length === 0 ? (<Text as="p">No contacts added yet.</Text>) : (
                    <BlockStack gap="300">
                        {contacts.map((contact) => (
                        <Card key={contact.id}>
                            <InlineStack align="space-between" blockAlign="center" wrap={false}>
                                <BlockStack gap="100">
                                    <Text variant="headingMd">{contact.name}</Text>
                                    <Text tone="subdued">{contact.subtitle}</Text>
                                </BlockStack>
                                <Form method="post">
                                    <input type="hidden" name="intent" value="delete_contact" />
                                    <input type="hidden" name="contactId" value={contact.id} />
                                    <Button submit variant="plain" tone="critical">Delete</Button>
                                </Form>
                            </InlineStack>
                        </Card>
                        ))}
                    </BlockStack>
                    )}
                </BlockStack>
            </Card>

            <div style={{marginTop: '20px'}}>
                <Card>
                    <BlockStack gap="300">
                        <Text variant="headingLg" as="h2">E-commerce Automations</Text>
                        {!currentPlanFeatures.automations && (<LockedFeatureBanner requiredPlan="Standard Growth">Unlock powerful e-commerce automations.</LockedFeatureBanner>)}
                    </BlockStack>
                </Card>
            </div>
        </Layout.Section>
      </Layout>
      
      {/* ADD CONTACT MODAL - NAYE PHONE INPUT KE SAATH */}
      <Modal open={isModalOpen} onClose={toggleModal} title="Add a new contact" primaryAction={{content: "Add Contact", onAction: () => document.getElementById('addContactForm').submit()}}>
        <Modal.Section>
            <Form method="post" id="addContactForm" onSubmit={event => {
                // Phone number ko form mein manually add karein
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'number';
                hiddenInput.value = modalFormState.number || '';
                event.currentTarget.appendChild(hiddenInput);
                toggleModal();
            }}>
            <input type="hidden" name="intent" value="create_contact" />
            <BlockStack gap="300">
                <TextField label="Name" name="name" value={modalFormState.name || ''} onChange={(v) => handleModalChange(v, 'name')} autoComplete="off" required/>
                <TextField label="Subtitle" name="subtitle" value={modalFormState.subtitle ||''} onChange={(v) => handleModalChange(v, 'subtitle')} autoComplete="off" />
                
                {/* --- YEH NAYA PHONE INPUT HAI --- */}
                <div className="phone-input-container">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">WhatsApp Number</Text>
                    <PhoneInput
                        international
                        defaultCountry="PK"
                        placeholder="Enter phone number"
                        value={modalFormState.number}
                        onChange={(value) => handleModalChange(value, 'number')}
                        inputComponent={CustomPhoneNumberInput}
                        required
                    />
                </div>
                 
                 {!currentPlanFeatures.automations && (<LockedFeatureBanner requiredPlan="Pro">Set agent availability times.</LockedFeatureBanner>)}
            </BlockStack>
            </Form>
        </Modal.Section>
      </Modal>
    </Page>
  );
}