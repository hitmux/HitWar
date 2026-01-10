/**
 * Help interface
 */

import { setupBackButton } from '../components/backButton';

/**
 * Help interface logic
 */
export function helpInterface(): void {
    const thisInterface = document.querySelector(".help-interface") as HTMLElement;
    setupBackButton(thisInterface, "main-interface");
}
