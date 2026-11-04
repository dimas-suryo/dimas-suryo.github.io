// Chromium can offer to install the app before the app's code has loaded: keep the offer for it.
addEventListener('beforeinstallprompt', (event) => (window.installPrompt = event));
