// File: app/routes/app.jsx
// Updated with Phone Input CSS

import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";

// Polaris styles
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
// Phone Number Input ke styles
import phoneInputStyles from 'react-phone-number-input/style.css?url'; // <-- YEH NAYI LINE ADD KI HAI

import { authenticate } from "../shopify.server";

// Stylesheets ko app mein load karein
export const links = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: phoneInputStyles }, // <-- YEH NAYI LINE ADD KI HAI
];

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Overview
        </Link>
        <Link to="/app/customize">
          Customization
        </Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// ... Baaki ErrorBoundary aur headers wala code waise hi rahega
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};