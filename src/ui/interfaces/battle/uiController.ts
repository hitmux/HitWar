/**
 * UI controller - handles pause, speed, zoom, and navigation buttons
 */

import { World } from '../../../game/world';
import { gotoPage } from '../../navigation/router';
import { PanelDragManager } from '../../panels/panelDrag';
import { InputHandler } from '../../../core/input/inputHandler';
import { SoundManager } from '../../../systems/sound/soundManager';
import { Sounds } from '../../../systems/sound/sounds';
import { SaveUI } from '../../../systems/save/saveUI';
import { GameController } from './gameController';
import type { CanvasWithInputHandler } from './types';

export interface UIControllerCallbacks {
    onBackClick: () => void;
    requestPauseRender: () => void;
}

export class UIController {
    private world: World;
    private canvasEle: CanvasWithInputHandler;
    private gameController: GameController;
    private callbacks: UIControllerCallbacks;

    // DOM elements
    private thisInterface: HTMLElement;
    private choiceBtn: HTMLElement;
    private pauseBtn: HTMLElement;
    private speedBtns: NodeListOf<HTMLElement>;
    private zoomLevelSpan: HTMLElement | null;
    private mobileControlsToggle: HTMLButtonElement | null;
    private mobilePauseBtn: HTMLButtonElement | null;
    private inputHandler: InputHandler | null = null;
    private eventSignal: AbortSignal | null = null;
    private uiAbortController: AbortController | null = null;
    private mobileControlsOpen = false;

    // Panel drag manager
    private panelDragManager: PanelDragManager;

    constructor(
        world: World,
        canvasEle: CanvasWithInputHandler,
        gameController: GameController,
        callbacks: UIControllerCallbacks
    ) {
        this.world = world;
        this.canvasEle = canvasEle;
        this.gameController = gameController;
        this.callbacks = callbacks;

        this.thisInterface = document.querySelector(".war-interface") as HTMLElement;
        this.choiceBtn = document.querySelector(".choiceBtn") as HTMLElement;
        this.pauseBtn = document.querySelector(".pause") as HTMLElement;
        this.speedBtns = document.querySelectorAll(".speedBtn") as NodeListOf<HTMLElement>;
        this.zoomLevelSpan = document.getElementById("zoomLevel");
        this.mobileControlsToggle = document.getElementById("mobileControlsToggle") as HTMLButtonElement | null;
        this.mobilePauseBtn = document.getElementById("mobilePauseBtn") as HTMLButtonElement | null;

        // Initialize panel drag
        this.panelDragManager = new PanelDragManager('speedControlPanel', '.dragHandle', 'speedControlPanelState');
    }

    /**
     * Initialize UI controller
     */
    init(): void {
        this.uiAbortController?.abort();
        this.uiAbortController = new AbortController();
        this.choiceBtn.style.display = "block";
        this.closeMobileControls();
        this.bindPauseButton();
        this.bindSpeedButtons();
        this.bindBackButton();
        this.bindMobileControls();
    }

    /**
     * Initialize input handler and canvas events
     */
    initInputHandler(): InputHandler {
        // Clean up old InputHandler
        if (this.canvasEle._inputHandler) {
            this.canvasEle._inputHandler.destroy();
        }

        // Create input handler
        this.inputHandler = new InputHandler(this.world.camera, this.canvasEle, { touchEnabled: true });
        this.canvasEle._inputHandler = this.inputHandler;
        this.inputHandler.onRenderRequest = () => this.callbacks.requestPauseRender();

        // Use AbortController to manage canvas event listeners
        if (this.canvasEle._eventAbortController) {
            this.canvasEle._eventAbortController.abort();
        }
        this.canvasEle._eventAbortController = new AbortController();
        this.eventSignal = this.canvasEle._eventAbortController.signal;

        // Bind zoom buttons
        this.bindZoomButtons();

        return this.inputHandler;
    }

    /**
     * Get the AbortSignal for canvas events
     */
    getEventSignal(): AbortSignal {
        if (!this.eventSignal) {
            throw new Error('UIController.getEventSignal() called before initInputHandler()');
        }
        return this.eventSignal;
    }

    /**
     * Get the InputHandler instance
     */
    getInputHandler(): InputHandler | null {
        return this.inputHandler;
    }

    /** Release input and UI listeners when leaving a single-player battle. */
    destroy(): void {
        this.uiAbortController?.abort();
        this.uiAbortController = null;
        this.inputHandler?.destroy();
        if (this.canvasEle._inputHandler === this.inputHandler) {
            delete this.canvasEle._inputHandler;
        }
        this.inputHandler = null;
        this.canvasEle._eventAbortController?.abort();
        this.canvasEle._eventAbortController = undefined;
        this.eventSignal = null;
        this.panelDragManager.destroy();
        this.closeMobileControls();
    }

    /**
     * Update zoom level display
     */
    updateZoomLevel(): void {
        if (this.zoomLevelSpan) {
            this.zoomLevelSpan.textContent = Math.round(this.world.camera.zoom * 100) + "%";
        }
    }

    /**
     * Toggle pause state
     */
    togglePause(): void {
        this.pauseBtn.click();
    }

    /**
     * Get current pause state
     */
    getIsGamePause(): boolean {
        return this.gameController.isGamePause;
    }

    /**
     * Restore speed button UI state from world
     */
    restoreSpeedButtonState(): void {
        this.speedBtns.forEach(btn => {
            btn.classList.remove("active");
            if (parseFloat(btn.dataset.speed!) === this.world.gameSpeed) {
                btn.classList.add("active");
            }
        });
    }

    /**
     * Add export button to UI
     * Note: Always recreate the button to ensure it references the current world
     */
    addExportButton(): void {
        const rightTopArea = this.thisInterface.querySelector(".rightTopArea") as HTMLElement;
        // Remove old button if exists (it may reference an old world instance)
        const oldBtn = rightTopArea.querySelector(".exportSaveBtn");
        if (oldBtn) {
            oldBtn.remove();
        }
        SaveUI.addExportButton(rightTopArea, () => this.world);
    }

    /**
     * Hide choice button panel
     */
    hideChoiceBtn(): void {
        this.choiceBtn.style.display = "none";
    }

    private bindPauseButton(): void {
        this.pauseBtn.addEventListener("click", () => {
            const isGamePause = !this.gameController.isGamePause;
            this.gameController.isGamePause = isGamePause;

            if (isGamePause) {
                this.pauseBtn.innerHTML = "开始";
                if (this.mobilePauseBtn) this.mobilePauseBtn.innerHTML = "开始";
                SoundManager.pauseAll();
                this.gameController.requestRenderOnPause();
            } else {
                this.pauseBtn.innerHTML = "暂停";
                if (this.mobilePauseBtn) this.mobilePauseBtn.innerHTML = "暂停";
                SoundManager.resumeAll();
                this.gameController.resetLoopAccumulator();
            }
        }, { signal: this.uiAbortController?.signal });
    }

    private bindSpeedButtons(): void {
        this.speedBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                this.speedBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.world.gameSpeed = parseFloat(btn.dataset.speed!);
            }, { signal: this.uiAbortController?.signal });
        });
    }

    private bindBackButton(): void {
        this.thisInterface.querySelector(".backPage")!.addEventListener("click", () => {
            this.callbacks.onBackClick();
            this.hideChoiceBtn();
            this.closeMobileControls();
            Sounds.switchBgm("main");
            gotoPage("modeChoice-interface");
        }, { signal: this.uiAbortController?.signal });
    }

    private bindZoomButtons(): void {
        const zoomInBtn = document.getElementById("zoomInBtn");
        const zoomOutBtn = document.getElementById("zoomOutBtn");
        const homeBtn = document.getElementById("homeBtn");

        if (zoomInBtn) {
            zoomInBtn.addEventListener("click", () => {
                this.inputHandler?.zoomIn();
            }, { signal: this.eventSignal ?? undefined });
        }
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener("click", () => {
                this.inputHandler?.zoomOut();
            }, { signal: this.eventSignal ?? undefined });
        }
        if (homeBtn) {
            homeBtn.addEventListener("click", () => {
                this.world.camera.centerOn(this.world.getBaseBuilding().pos);
                this.callbacks.requestPauseRender();
            }, { signal: this.eventSignal ?? undefined });
        }
    }

    private bindMobileControls(): void {
        this.mobilePauseBtn?.addEventListener("click", () => {
            this.pauseBtn.click();
        }, { signal: this.uiAbortController?.signal });
        if (!this.mobileControlsToggle) return;
        this.mobileControlsToggle.addEventListener("click", () => {
            this.mobileControlsOpen = !this.mobileControlsOpen;
            this.updateMobileControlsState();
        }, { signal: this.uiAbortController?.signal });
    }

    private closeMobileControls(): void {
        this.mobileControlsOpen = false;
        this.updateMobileControlsState();
    }

    private updateMobileControlsState(): void {
        const panel = document.getElementById("speedControlPanel");
        if (panel) {
            panel.classList.toggle("mobileControlsOpen", this.mobileControlsOpen);
        }
        if (this.mobileControlsToggle) {
            this.mobileControlsToggle.setAttribute("aria-expanded", String(this.mobileControlsOpen));
        }
    }
}
