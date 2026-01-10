/**
 * HitWar Application Entry Point
 *
 * This is the main entry file for the ES Modules version of HitWar.
 * It imports styles and initializes the game.
 */

// Import styles (Vite handles LESS compilation)
import './styles/index.less';

// Import game initialization
import {
    GAME_VERSION,
    initAppElements,
    loadAllImages,
    gotoPage
} from './ui/index';

import {
    mainInterface,
    helpInterface,
    choiceInterface,
    wikiInterface,
    cannonInterface,
    monstersInterface,
    endlessMode
} from './ui/interfaces/index';

import { NoteManager, NoteUI } from './ui/notes/index';
import { initBGM } from './systems/sound/sounds';

// Initialize global compatibility exports
import { initGlobalExports } from './compat/globalExports';

// Initialize the application
async function initApp(): Promise<void> {
    const loadingScreen = document.getElementById('loadingScreen');
    const progressBar = document.getElementById('progressBar');
    const loadingText = document.getElementById('loadingText');
    const gameApp = document.querySelector('.gameApp') as HTMLElement | null;

    if (!loadingScreen || !progressBar || !loadingText || !gameApp) {
        console.error('Missing required DOM elements');
        return;
    }

    try {
        // Update progress: Loading images
        loadingText.textContent = 'Loading images...';
        progressBar.style.width = '20%';

        await loadAllImages();
        progressBar.style.width = '50%';

        // Update progress: Loading notes
        loadingText.textContent = 'Loading notes...';
        await NoteManager.loadNotes();
        progressBar.style.width = '80%';

        // Initialize global compatibility
        loadingText.textContent = 'Initializing...';
        initGlobalExports();
        progressBar.style.width = '90%';

        // Initialize app elements
        initAppElements();
        progressBar.style.width = '100%';

        // Initialize BGM
        initBGM();

        // Initialize note UI
        NoteUI.initAfterLoad();

        // Show version info
        const versionInfo = document.getElementById('versionInfo');
        if (versionInfo) {
            versionInfo.textContent = `v${GAME_VERSION}`;
        }

        // Fade out loading screen and show game
        loadingText.textContent = 'Ready!';
        setTimeout(() => {
            loadingScreen.classList.add('fadeOut');
            gameApp.style.display = 'block';

            // Initialize main interface
            mainInterface();

            // Completely hide loading screen after fade
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 300);

    } catch (error) {
        console.error('Failed to initialize app:', error);
        loadingText.textContent = `Error: ${(error as Error).message}`;
        loadingText.style.color = '#ff6b6b';
    }
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Export for debugging
window.__HitWar_VERSION__ = GAME_VERSION;
console.log(`HitWar v${GAME_VERSION} - ES Modules`);
