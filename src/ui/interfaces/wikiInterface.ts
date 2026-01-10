/**
 * Wiki interface
 */

import { gotoPage } from '../navigation/router';
import { cannonInterface } from './cannonInterface';
import { monstersInterface } from './monstersInterface';

// Flag to prevent multiple event bindings
let isInitialized = false;

/**
 * Wiki interface logic
 */
export function wikiInterface(): void {
    let thisInterface = document.querySelector(".wiki-interface") as HTMLElement;

    // Only add event listeners once
    if (!isInitialized) {
        thisInterface.querySelector(".cannonList")!.addEventListener("click", () => {
            gotoPage("cannon-interface");
            cannonInterface();
        });
        thisInterface.querySelector(".monsterList")!.addEventListener("click", () => {
            gotoPage("monsters-interface");
            monstersInterface();
        });
        thisInterface.querySelector(".backPage")!.addEventListener("click", () => {
            gotoPage("main-interface");
        });
        isInitialized = true;
    }
}
