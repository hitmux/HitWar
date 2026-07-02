/**
 * Main menu interface
 */

import { GAME_VERSION } from '../state/appState';
import { gotoPage } from '../navigation/router';
import { choiceInterface } from './choiceInterface';
import { wikiInterface } from './wikiInterface';
import { helpInterface } from './helpInterface';
import { connectInterface } from './multiplayer';

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

    multiplayerBtn.addEventListener("click", () => {
        gotoPage("multiplayer-connect-interface");
        connectInterface();
    });

    wikiBtn.addEventListener("click", () => {
        gotoPage("wiki-interface");
        wikiInterface();
    });
    helpBtn.addEventListener("click", () => {
        gotoPage("help-interface");
        helpInterface();
    });
}
