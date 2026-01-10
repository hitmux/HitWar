/**
 * Back button component
 * Provides a unified way to setup back button click handlers
 */

import { gotoPage } from '../navigation/router';

export interface BackButtonOptions {
    /**
     * Optional callback to run before navigation
     * Return false to prevent navigation
     */
    beforeNavigate?: () => boolean | void;
}

/**
 * Setup a back button within an interface element
 * @param interfaceElement The interface container element
 * @param targetPage The page to navigate to when clicked
 * @param options Optional configuration
 */
export function setupBackButton(
    interfaceElement: HTMLElement,
    targetPage: string,
    options?: BackButtonOptions
): void {
    const backBtn = interfaceElement.querySelector(".backPage");
    if (!backBtn) {
        console.warn('Back button not found in interface');
        return;
    }

    backBtn.addEventListener("click", () => {
        if (options?.beforeNavigate) {
            const result = options.beforeNavigate();
            if (result === false) {
                return;
            }
        }
        gotoPage(targetPage);
    });
}

/**
 * Setup a back button by interface selector
 * @param interfaceSelector CSS selector for the interface
 * @param targetPage The page to navigate to when clicked
 * @param options Optional configuration
 */
export function setupBackButtonBySelector(
    interfaceSelector: string,
    targetPage: string,
    options?: BackButtonOptions
): void {
    const interfaceElement = document.querySelector(interfaceSelector) as HTMLElement;
    if (!interfaceElement) {
        console.warn(`Interface not found: ${interfaceSelector}`);
        return;
    }
    setupBackButton(interfaceElement, targetPage, options);
}
