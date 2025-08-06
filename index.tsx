import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider, LanguageProvider } from './contexts';
import { registerSW } from 'virtual:pwa-register';
import './index.css';

// Automatically register the service worker.
// With registerType: 'autoUpdate' in vite.config.ts, this will update the PWA in the background.
registerSW({ onOfflineReady: () => console.log('App is ready to work offline.') });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <ThemeProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ThemeProvider>
    </HashRouter>
  </React.StrictMode>
);
