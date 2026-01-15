/**
 * Help interface
 */

import { setupBackButton } from '../components/backButton';
import { NoteManager, NoteUI } from '../notes';

/**
 * Help interface logic
 */
export function helpInterface(): void {
    const thisInterface = document.querySelector(".help-interface") as HTMLElement;
    setupBackButton(thisInterface, "main-interface");

    const openGuideBtn = thisInterface.querySelector("#helpOpenGuideBtn") as HTMLButtonElement | null;
    if (openGuideBtn) {
        openGuideBtn.onclick = () => {
            try {
                const guideIndex = NoteManager.notes.findIndex(
                    (n) => n.id === "0001" || n.file === "0001.md"
                );
                // Ensure the note panel is visible before switching to content view.
                NoteUI.showNoteList();
                if (guideIndex >= 0) {
                    void NoteUI.showNoteContent(guideIndex);
                }
            } catch (error) {
                console.error("Failed to open guide note:", error);
            }
        };
    }
}
