/**
 * Multiplayer UI Controller
 * Simplified UI controller for multiplayer battle mode
 * Hides speed controls and adds surrender button
 */

import { InputHandler } from '../../../core/input/inputHandler';
import { Vector } from '../../../core/math/vector';
import type { MultiplayerWorldFacade } from './multiplayerWorldFacade';
import type { MultiplayerGameController } from './multiplayerGameController';
import type { NetworkClient } from '../../../network/networkClient';
import type { CanvasWithInputHandler } from './types';

export interface MultiplayerUICallbacks {
    onBackClick: () => void;
    requestPauseRender: () => void;
}

/**
 * UI controller for multiplayer mode
 * Provides zoom controls and surrender functionality
 */
export class MultiplayerUIController {
    private _worldFacade: MultiplayerWorldFacade;
    private _canvasEle: CanvasWithInputHandler;
    private _gameController: MultiplayerGameController;
    private _networkClient: NetworkClient;
    private _callbacks: MultiplayerUICallbacks;

    private _inputHandler: InputHandler | null = null;
    private _eventSignal: AbortSignal | null = null;
    private _zoomLevelSpan: HTMLElement | null = null;
    private _surrenderBtn: HTMLButtonElement | null = null;

    constructor(
        worldFacade: MultiplayerWorldFacade,
        canvasEle: CanvasWithInputHandler,
        gameController: MultiplayerGameController,
        networkClient: NetworkClient,
        callbacks: MultiplayerUICallbacks
    ) {
        this._worldFacade = worldFacade;
        this._canvasEle = canvasEle;
        this._gameController = gameController;
        this._networkClient = networkClient;
        this._callbacks = callbacks;
    }

    // === Initialization ===

    /**
     * Initialize UI elements
     */
    init(): void {
        this._hideSpeedControls();
        this._hidePauseButton();
        this._hideSaveControls();
        this._addSurrenderButton();
        this._showChoiceButton();
    }

    /**
     * Initialize input handler for camera controls
     */
    initInputHandler(): InputHandler {
        // Cleanup old InputHandler
        if (this._canvasEle._inputHandler) {
            this._canvasEle._inputHandler.destroy();
        }

        // Create input handler
        this._inputHandler = new InputHandler(
            this._worldFacade.camera,
            this._canvasEle
        );
        this._canvasEle._inputHandler = this._inputHandler;
        this._inputHandler.onRenderRequest = () => this._callbacks.requestPauseRender();

        // Setup AbortController for event cleanup
        if (this._canvasEle._eventAbortController) {
            this._canvasEle._eventAbortController.abort();
        }
        this._canvasEle._eventAbortController = new AbortController();
        this._eventSignal = this._canvasEle._eventAbortController.signal;

        // Bind zoom buttons
        this._bindZoomButtons();

        // Bind back button
        this._bindBackButton();

        return this._inputHandler;
    }

    // === Public Accessors ===

    /**
     * Get event abort signal for cleanup
     */
    getEventSignal(): AbortSignal {
        if (!this._eventSignal) {
            throw new Error('MultiplayerUIController.getEventSignal() called before initInputHandler()');
        }
        return this._eventSignal;
    }

    /**
     * Get input handler
     */
    getInputHandler(): InputHandler | null {
        return this._inputHandler;
    }

    /**
     * Update zoom level display
     */
    updateZoomLevel(): void {
        if (this._zoomLevelSpan) {
            this._zoomLevelSpan.textContent = Math.round(this._worldFacade.camera.zoom * 100) + '%';
        }
    }

    /**
     * Cleanup UI elements
     */
    destroy(): void {
        // Remove surrender button
        if (this._surrenderBtn && this._surrenderBtn.parentNode) {
            this._surrenderBtn.parentNode.removeChild(this._surrenderBtn);
            this._surrenderBtn = null;
        }

        // Restore hidden controls
        this._showSpeedControls();
        this._showPauseButton();
    }

    // === Private Methods ===

    /**
     * Hide speed control panel (multiplayer has no speed control)
     */
    private _hideSpeedControls(): void {
        const panel = document.getElementById('speedControlPanel');
        if (panel) {
            panel.style.display = 'none';
        }

        // Also hide individual speed buttons
        const speedBtns = document.querySelectorAll('.speedBtn');
        speedBtns.forEach(btn => {
            (btn as HTMLElement).style.display = 'none';
        });
    }

    /**
     * Restore speed controls (for cleanup)
     */
    private _showSpeedControls(): void {
        const panel = document.getElementById('speedControlPanel');
        if (panel) {
            panel.style.display = '';
        }

        const speedBtns = document.querySelectorAll('.speedBtn');
        speedBtns.forEach(btn => {
            (btn as HTMLElement).style.display = '';
        });
    }

    /**
     * Hide pause button (multiplayer cannot pause)
     */
    private _hidePauseButton(): void {
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.style.display = 'none';
        }
    }

    /**
     * Restore pause button (for cleanup)
     */
    private _showPauseButton(): void {
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.style.display = '';
        }
    }

    /**
     * Hide save/export controls (multiplayer doesn't support saves)
     */
    private _hideSaveControls(): void {
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.style.display = 'none';
        }
    }

    /**
     * Show choice button panel
     */
    private _showChoiceButton(): void {
        const choiceBtn = document.querySelector('.choiceBtn') as HTMLElement;
        if (choiceBtn) {
            choiceBtn.style.display = 'block';
        }
    }

    /**
     * Bind zoom buttons
     */
    private _bindZoomButtons(): void {
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const homeBtn = document.getElementById('homeBtn');
        this._zoomLevelSpan = document.getElementById('zoomLevel');

        const signal = this._eventSignal ?? undefined;

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                this._inputHandler?.zoomIn();
            }, { signal });
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                this._inputHandler?.zoomOut();
            }, { signal });
        }

        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                const base = this._worldFacade.getBaseBuilding() as { pos?: { x: number; y: number } };
                if (base?.pos) {
                    this._worldFacade.camera.centerOn(base.pos as Vector);
                    this._callbacks.requestPauseRender();
                }
            }, { signal });
        }
    }

    /**
     * Bind back button
     */
    private _bindBackButton(): void {
        const backBtn = document.getElementById('backBtn');
        const signal = this._eventSignal ?? undefined;

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                // In multiplayer, back means surrender
                if (confirm('确定要投降吗？这将结束当前对局。')) {
                    this._networkClient.surrender();
                    this._callbacks.onBackClick();
                }
            }, { signal });
        }
    }

    /**
     * Add surrender button to UI
     */
    private _addSurrenderButton(): void {
        // Find the control panel to add surrender button
        const controlPanel = document.querySelector('.war-interface .controlPanel') ??
                            document.querySelector('.controlPanel');

        if (controlPanel && !this._surrenderBtn) {
            this._surrenderBtn = document.createElement('button');
            this._surrenderBtn.id = 'surrenderBtn';
            this._surrenderBtn.className = 'controlBtn surrenderBtn';
            this._surrenderBtn.textContent = '投降';
            this._surrenderBtn.style.cssText = `
                background-color: #dc3545;
                color: white;
                border: none;
                padding: 8px 16px;
                margin: 4px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;

            this._surrenderBtn.addEventListener('click', () => {
                if (confirm('确定要投降吗？这将结束当前对局。')) {
                    this._networkClient.surrender();
                    // 与返回按钮路径一致：直接触发清理回调
                    this._callbacks.onBackClick();
                }
            }, { signal: this._eventSignal ?? undefined });

            controlPanel.appendChild(this._surrenderBtn);
        }
    }
}
