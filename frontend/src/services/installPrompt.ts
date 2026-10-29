// Browsers fire `beforeinstallprompt` once, early — before any settings UI is open — so catch it at startup.
export type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function captureInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); // we show our own button instead of the mini-infobar
        deferred = e as InstallPromptEvent;
        notify();
    });
    window.addEventListener('appinstalled', () => {
        deferred = null;
        notify();
    });
}

export const getInstallPrompt = () => deferred;
export const clearInstallPrompt = () => {
    deferred = null;
    notify();
};
export function onInstallPromptChange(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
