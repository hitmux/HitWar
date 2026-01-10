/**
 * Global application state management
 */

// Version injected by Vite from package.json
declare const __APP_VERSION__: string;
export const GAME_VERSION = __APP_VERSION__;

// DOM elements
export let app: HTMLElement | null = null;
export let interfaceArr: HTMLCollection | null = null;

/**
 * Initialize DOM element references
 */
export function initAppElements(): void {
    app = document.querySelector(".gameApp");
    if (app) {
        interfaceArr = app.children;
    }
}

/**
 * Get app element
 */
export function getApp(): HTMLElement | null {
    return app;
}

/**
 * Get interface array
 */
export function getInterfaceArr(): HTMLCollection | null {
    return interfaceArr;
}
