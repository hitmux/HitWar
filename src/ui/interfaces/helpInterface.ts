/**
 * Help interface
 */

import { gotoPage } from '../navigation/router';

/**
 * Help interface logic
 */
export function helpInterface(): void {
    let thisInterface = document.querySelector(".help-interface") as HTMLElement;
    thisInterface.querySelector(".backPage")!.addEventListener("click", () => {
        gotoPage("main-interface");
    });
}
