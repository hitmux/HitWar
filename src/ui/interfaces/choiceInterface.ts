/**
 * Mode choice interface
 */

import { gotoPage } from '../navigation/router';
import { SaveUI } from '../../systems/save/saveUI';
import { endlessMode } from './endlessMode';
import { setupBackButton } from '../components/backButton';

/**
 * Mode choice interface logic
 */
export function choiceInterface(): void {
    const thisInterface = document.querySelector(".modeChoice-interface") as HTMLElement;

    thisInterface.querySelector(".endlessMode-easy")!.addEventListener("click", () => {
        gotoPage("war-interface");
        requestAnimationFrame(() => {
            endlessMode("easy");
        });
    });
    thisInterface.querySelector(".endlessMode-normal")!.addEventListener("click", () => {
        gotoPage("war-interface");
        requestAnimationFrame(() => {
            endlessMode("normal");
        });
    });
    thisInterface.querySelector(".endlessMode-hard")!.addEventListener("click", () => {
        gotoPage("war-interface");
        requestAnimationFrame(() => {
            endlessMode("hard");
        });
    });
    // Infinite time mode
    thisInterface.querySelector(".infiniteTimeMode-easy")!.addEventListener("click", () => {
        gotoPage("war-interface");
        requestAnimationFrame(() => {
            endlessMode("easy", false);
        });
    });
    thisInterface.querySelector(".infiniteTimeMode-hard")!.addEventListener("click", () => {
        gotoPage("war-interface");
        requestAnimationFrame(() => {
            endlessMode("hard", false);
        });
    });

    setupBackButton(thisInterface, "main-interface");

    // Add import save button if not already added
    if (!thisInterface.querySelector(".importSaveBtn")) {
        const btnList = thisInterface.querySelector(".btnList") as HTMLElement;
        SaveUI.addImportButton(btnList, (saveData: unknown) => {
            const data = saveData as { mode: string; haveFlow: boolean };
            SaveUI.showImportSuccess(saveData as any);
            gotoPage("war-interface");
            requestAnimationFrame(() => {
                endlessMode(data.mode, data.haveFlow, saveData);
            });
        });
    }
}
