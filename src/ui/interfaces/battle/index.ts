/**
 * Battle mode entry point
 * Manages game initialization and controller coordination
 */

import { World } from '../../../game/world';
import { SaveManager } from '../../../systems/save/saveManager';
import { SaveUI } from '../../../systems/save/saveUI';
import { Sounds } from '../../../systems/sound/sounds';
import { GameController } from './gameController';
import { UIController } from './uiController';
import { PanelManager } from './panelManager';
import { CheatModeUI } from './cheatMode';
import { KeyboardHandler } from './keyboardHandler';
import type { CanvasWithInputHandler, BattleModeConfig } from './types';

// Re-export types for external use
export type { BattleModeConfig, GameEntity, CanvasWithInputHandler } from './types';

/**
 * Start battle mode
 * @param mode - Game mode: "easy", "normal", "hard"
 * @param haveGroup - Whether to have monster waves, false for infinite time mode
 * @param loadedSaveData - If has save data, load it directly
 */
export function startBattleMode(mode: string, haveGroup: boolean = true, loadedSaveData: unknown = null): void {
    const canvasEle = document.querySelector("#mainCanvas") as CanvasWithInputHandler;

    // Switch background music
    Sounds.switchBgm("war");

    // Create world (3x canvas size)
    const viewWidth = canvasEle.width;
    const viewHeight = canvasEle.height;
    const worldWidth = viewWidth * 3;
    const worldHeight = viewHeight * 3;
    const world = new World(worldWidth, worldHeight, viewWidth, viewHeight);
    world.resizeCanvas(canvasEle);

    world.mode = mode;
    if (!haveGroup) {
        world.haveFlow = false;
        if (mode === "hard") {
            world.user.money = 1000;
        }
    }

    // Handle save data loading
    const startGame = () => {
        initGameLoop(world, canvasEle, mode, haveGroup);
    };

    // If loaded from file import, apply save data directly
    if (loadedSaveData) {
        SaveManager.deserialize(loadedSaveData as any, world as any, null);
        startGame();
        return;
    }

    // Check for existing save in localStorage
    if (SaveManager.hasSave(mode, haveGroup)) {
        const saveData = SaveManager.loadFromLocal(mode, haveGroup);
        if (saveData) {
            SaveUI.showContinueDialog(
                saveData.timestamp,
                () => {
                    SaveManager.deserialize(saveData, world as any, null);
                    startGame();
                },
                () => {
                    SaveManager.clearSave(mode, haveGroup);
                    startGame();
                }
            );
            return;
        }
    }

    startGame();
}

/**
 * Initialize game loop and controllers
 */
function initGameLoop(
    world: World,
    canvasEle: CanvasWithInputHandler,
    mode: string,
    haveGroup: boolean
): void {
    // Generate unique session ID
    const sessionId = Date.now().toString() + Math.random().toString(36).slice(2);

    // Create game controller
    const gameController = new GameController(
        world,
        canvasEle,
        mode,
        haveGroup,
        {
            onGameEnd: () => {
                keyboardHandler.detach();
                panelManager.destroy();
            },
            onFailure: () => {
                alert("你失败了");
                location.reload();
            },
            updateZoomLevel: () => {
                uiController.updateZoomLevel();
            }
        }
    );

    // Create UI controller
    const uiController = new UIController(
        world,
        canvasEle,
        gameController,
        {
            onBackClick: () => {
                gameController.gameEnd = true;
            },
            requestPauseRender: () => {
                gameController.requestPauseRender();
            }
        }
    );
    uiController.init();
    uiController.initInputHandler();

    // Create cheat mode UI
    const cheatModeUI = new CheatModeUI(world, {
        getIsGamePause: () => gameController.isGamePause,
        togglePause: () => uiController.togglePause()
    });
    cheatModeUI.init();

    // Create keyboard handler
    const keyboardHandler = new KeyboardHandler(world, {
        togglePause: () => uiController.togglePause(),
        getIsGamePause: () => gameController.isGamePause
    });
    keyboardHandler.attach();

    // Create panel manager
    const panelManager = new PanelManager(
        world,
        canvasEle,
        sessionId,
        uiController.getEventSignal(),
        {
            requestPauseRender: () => {
                gameController.requestPauseRender();
            },
            getGameEnd: () => gameController.gameEnd
        }
    );
    panelManager.init();

    // Restore UI state from save data
    uiController.restoreSpeedButtonState();
    cheatModeUI.restoreFromWorld();
    uiController.addExportButton();

    // Start game loop
    gameController.start();
}

/**
 * Legacy alias for backward compatibility
 * @deprecated Use startBattleMode instead
 */
export const endlessMode = startBattleMode;
