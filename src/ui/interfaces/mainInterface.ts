/**
 * Main menu interface
 */

import { GAME_VERSION, OFFLINE_SINGLE_PLAYER } from '../state/appState';
import { gotoPage } from '../navigation/router';
import { choiceInterface } from './choiceInterface';
import { wikiInterface } from './wikiInterface';
import { helpInterface } from './helpInterface';

/**
 * Main menu interface logic
 */
export function mainInterface(): void {
    let startBtn = document.querySelector(".startGame") as HTMLElement;
    let multiplayerBtn = document.querySelector(".multiplayerMode") as HTMLElement;
    let wikiBtn = document.querySelector(".wiki") as HTMLElement;
    let helpBtn = document.querySelector(".help") as HTMLElement;

    // Display version
    document.getElementById("versionInfo")!.textContent = "v" + GAME_VERSION;

    startBtn.addEventListener("click", () => {
        gotoPage("modeChoice-interface");
        choiceInterface();
    });

    if (OFFLINE_SINGLE_PLAYER) {
        // Keep the offline distribution self-contained and make accidental
        // network entry impossible from the main menu.
        multiplayerBtn?.remove();
    } else if (multiplayerBtn) {
        multiplayerBtn.addEventListener("click", async () => {
            const { connectInterface } = await import('./multiplayer');
            gotoPage("multiplayer-connect-interface");
            connectInterface();
        });
    }

    wikiBtn.addEventListener("click", () => {
        gotoPage("wiki-interface");
        wikiInterface();
    });
    helpBtn.addEventListener("click", () => {
        gotoPage("help-interface");
        helpInterface();
    });
}
