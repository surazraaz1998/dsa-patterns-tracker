// import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { applyPrefs, watchSystemPrefs } from './services/prefs';
import { installSlowRequestWatcher } from './services/slowNetwork';
import { API_BASE_URL } from './services/api';
import { captureInstallPrompt } from './services/installPrompt';

applyPrefs();
watchSystemPrefs();
installSlowRequestWatcher(API_BASE_URL);
captureInstallPrompt();

// Offline support + installability. Production only, so dev reloads never serve stale files.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker not registered:', err));
    });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    // <React.StrictMode>
    <App />
    // </React.StrictMode>,
);
