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
    private inputHandler: InputHandler | null = null;
    private eventSignal: AbortSignal | null = null;

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

        // Initialize panel drag
        this.panelDragManager = new PanelDragManager('speedControlPanel', '.dragHandle', 'speedControlPanelState');
    }

    /**
     * Initialize UI controller
     */
    init(): void {
        this.choiceBtn.style.display = "block";
        this.bindPauseButton();
        this.bindSpeedButtons();
        this.bindBackButton();
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
        this.inputHandler = new InputHandler(this.world.camera, this.canvasEle);
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
        SaveUI.addExportButton(rightTopArea, () => this.world as any);
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
                SoundManager.pauseAll();
                this.gameController.requestRenderOnPause();
            } else {
                this.pauseBtn.innerHTML = "暂停";
                SoundManager.resumeAll();
                this.gameController.resetLoopAccumulator();
            }
        });
    }

    private bindSpeedButtons(): void {
        this.speedBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                this.speedBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.world.gameSpeed = parseFloat(btn.dataset.speed!);
            });
        });
    }

    private bindBackButton(): void {
        this.thisInterface.querySelector(".backPage")!.addEventListener("click", () => {
            this.callbacks.onBackClick();
            this.hideChoiceBtn();
            Sounds.switchBgm("main");
            gotoPage("modeChoice-interface");
        });
    }

    private bindZoomButtons(): void {
        const zoomInBtn = document.getElementById("zoomInBtn");
        const zoomOutBtn = document.getElementById("zoomOutBtn");
        const homeBtn = document.getElementById("homeBtn");

        if (zoomInBtn) {
            zoomInBtn.addEventListener("click", () => {
                this.inputHandler?.zoomIn();
            });
        }
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener("click", () => {
                this.inputHandler?.zoomOut();
            });
        }
        if (homeBtn) {
            homeBtn.addEventListener("click", () => {
                this.world.camera.centerOn(this.world.rootBuilding.pos);
                this.callbacks.requestPauseRender();
            });
        }
    }
}
