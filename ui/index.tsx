import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Redirect to HTTPS via dyndns if on HTTP (required for wallet connections)
async function redirectToHttpsIfNeeded(): Promise<boolean> {
  // Skip if already on HTTPS or localhost
  if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
    return false;
  }

  try {
    // Fetch the dyndns domain via nginx proxy (avoids CORS)
    const response = await fetch('/global-envs');
    if (!response.ok) throw new Error('Failed to fetch global envs');

    const envs = await response.json();
    const dyndnsDomain = envs.DOMAIN;

    if (!dyndnsDomain) {
      console.warn('No dyndns domain found, cannot redirect to HTTPS');
      return false;
    }

    // Determine the subdomain based on current hostname
    // e.g., ui.starknetstaking-sepolia.dappnode -> starknetstaking-sepolia
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    const packageName = parts.length >= 2 ? parts[1] : parts[0]; // Get package name from hostname

    // Construct the HTTPS URL
    const httpsUrl = `https://${packageName}.${dyndnsDomain}${window.location.pathname}${window.location.search}`;

    console.log(`Redirecting to HTTPS: ${httpsUrl}`);
    window.location.href = httpsUrl;
    return true;
  } catch (error) {
    console.error('Failed to redirect to HTTPS:', error);
    return false;
  }
}

// Initialize app
async function init() {
  const redirected = await redirectToHttpsIfNeeded();

  // If we're redirecting, don't render the app
  if (redirected) {
    return;
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

init();
