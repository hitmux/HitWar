/**
 * Wiki interface
 */

import { gotoPage } from '../navigation/router';
import { cannonInterface } from './cannonInterface';
import { monstersInterface } from './monstersInterface';
import { setupBackButton } from '../components/backButton';
import { withInitGuard } from '../utils/initGuard';

/**
 * Wiki interface logic
 */
export function wikiInterface(): void {
    const thisInterface = document.querySelector(".wiki-interface") as HTMLElement;

    withInitGuard('wiki-interface', () => {
        thisInterface.querySelector(".cannonList")!.addEventListener("click", () => {
            gotoPage("cannon-interface");
            cannonInterface();
        });
        thisInterface.querySelector(".monsterList")!.addEventListener("click", () => {
            gotoPage("monsters-interface");
            monstersInterface();
        });
        setupBackButton(thisInterface, "main-interface");
    });
}
