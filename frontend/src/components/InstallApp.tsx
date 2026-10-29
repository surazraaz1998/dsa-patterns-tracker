import React, { useEffect, useState } from 'react';
import { FaDownload } from 'react-icons/fa';
import { clearInstallPrompt, getInstallPrompt, onInstallPromptChange } from '../services/installPrompt';

const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** "Install app" button (Chrome/Edge/Android), or the Add-to-Home-Screen hint on iOS. Hidden once installed. */
export const InstallApp: React.FC = () => {
    const [prompt, setPrompt] = useState(getInstallPrompt);
    const [installed, setInstalled] = useState(isStandalone);

    useEffect(() => onInstallPromptChange(() => setPrompt(getInstallPrompt())), []);

    if (installed) return null;
    if (prompt) {
        return (
            <button
                type="button"
                onClick={async () => {
                    await prompt.prompt();
                    if ((await prompt.userChoice).outcome === 'accepted') setInstalled(true);
                    clearInstallPrompt();
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
            >
                <FaDownload size={11} /> Install app (works offline)
            </button>
        );
    }
    if (isIOS()) {
        return <p className="text-xs text-slate-400">Install on iPhone: tap <strong className="text-slate-200">Share</strong> → <strong className="text-slate-200">Add to Home Screen</strong>.</p>;
    }
    return null;
};
