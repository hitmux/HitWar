/**
 * UI module barrel export
 */

// State
export { GAME_VERSION, initAppElements, getApp, getInterfaceArr } from './state/appState';

// Assets
export { UP_LEVEL_ICON, TOWER_IMG, MONSTER_IMG, loadAllImages } from './assets/imageLoader';

// Navigation
export { gotoPage } from './navigation/router';

// Panels
export { PanelDragManager } from './panels/panelDrag';

// Components
export { setupBackButton, setupBackButtonBySelector } from './components/backButton';
export { createEntityCard, getAssetUrl } from './components/entityCard';

// Utils
export { withInitGuard, isInitialized, resetInitialization, resetAllInitializations } from './utils/initGuard';

// Interfaces
export {
    mainInterface,
    helpInterface,
    choiceInterface,
    wikiInterface,
    cannonInterface,
    monstersInterface,
    endlessMode
} from './interfaces/index';
