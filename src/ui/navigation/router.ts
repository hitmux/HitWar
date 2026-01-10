/**
 * Page navigation router
 */

import { getInterfaceArr } from '../state/appState';

/**
 * Navigate to a page by class name
 * @param className - The class name of the interface to show
 */
export function gotoPage(className: string): void {
    const interfaceArr = getInterfaceArr();
    if (!interfaceArr) return;

    for (let i = 0; i < interfaceArr.length; i++) {
        const pageHTMLEle = interfaceArr[i] as HTMLElement;
        if (pageHTMLEle.classList.contains(className)) {
            pageHTMLEle.style.display = "block";
        } else {
            pageHTMLEle.style.display = "none";
        }
    }
}
