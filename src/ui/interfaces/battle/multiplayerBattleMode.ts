/**
 * Multiplayer Battle Mode Entry Point
 * Initializes and manages the multiplayer game session
 */

import { getNetworkClient, NetworkEvent } from '../../../network/networkClient';
import { NetworkWorldAdapter } from '../../../network/rendering/networkWorldAdapter';
import { WorldRenderer } from '../../../game/rendering/worldRenderer';
import type { World } from '../../../game/world';
import { Sounds } from '../../../systems/sound/sounds';
import { gotoPage } from '../../navigation/router';
import { showGameEndModal } from '../../components';
import { initWorkerRendering, disposeWorkerRendering } from '../../../workers';
import { PR } from '../../../core/staticInitData';

import { MultiplayerWorldFacade } from './multiplayerWorldFacade';
import { MultiplayerGameController } from './multiplayerGameController';
import { MultiplayerUIController } from './multiplayerUIController';
import { PanelManager } from './panelManager';
import { KeyboardHandler } from './keyboardHandler';
import type { CanvasWithInputHandler } from './types';

function getCanvasViewportSize(canvasEle: HTMLCanvasElement): { width: number; height: number } {
    const rect = canvasEle.getBoundingClientRect();
    const width = Math.round(rect.width || canvasEle.clientWidth || canvasEle.width / PR);
    const height = Math.round(rect.height || canvasEle.clientHeight || canvasEle.height / PR);

    return {
        width: Math.max(1, width),
        height: Math.max(1, height)
    };
}

/**
 * Start multiplayer battle mode
 * Called when game starts from waiting room
 */
export function startMultiplayerBattleMode(): void {
    const canvasEle = document.querySelector('#mainCanvas') as CanvasWithInputHandler;
    const client = getNetworkClient();

    // Validate game state
    const gameState = client.gameState;
    if (!gameState) {
        console.error('[MultiplayerBattle] No game state available');
        gotoPage('multiplayer-lobby-interface');
        return;
    }

    console.log('[MultiplayerBattle] Starting multiplayer battle mode');

    // Switch background music
    Sounds.switchBgm('war');

    // Get map dimensions from game state
    const mapConfig = (gameState as { mapConfig?: { width: number; height: number } }).mapConfig;
    const worldWidth = mapConfig?.width ?? 6000;
    const worldHeight = mapConfig?.height ?? 4000;
    const { width: viewWidth, height: viewHeight } = getCanvasViewportSize(canvasEle);

    // Create network world adapter
    const adapter = new NetworkWorldAdapter(
        client,
        client.playerId,
        viewWidth,
        viewHeight,
        worldWidth,
        worldHeight
    );

    // Bind adapter to game state
    // Structural mismatch: gameState is Colyseus schema, adapter expects local view interface
    adapter.bindGameState(gameState as unknown as Parameters<typeof adapter.bindGameState>[0]);
    adapter.bindEventHandlers();

    // Initialize Worker rendering pipeline (fog + territory offloading)
    const fogProxy = adapter.getFogProxy();
    if (fogProxy) {
        initWorkerRendering(fogProxy.fog, adapter.getAllTerritories());
    }

    // Create world renderer
    const renderer = new WorldRenderer(adapter.getRendererContext());

    // Create world facade for PanelManager compatibility
    const worldFacade = new MultiplayerWorldFacade(adapter, client);

    // Generate unique session ID
    const sessionId = `mp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Cleanup function
    let isCleanedUp = false;
    const cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;

        console.log('[MultiplayerBattle] Cleaning up...');

        // Remove event listeners
        client.events.off(NetworkEvent.GAME_ENDED, onGameEnded);
        client.events.off(NetworkEvent.PLAYER_ELIMINATED, onPlayerEliminated);

        // Dispose Worker rendering pipeline
        disposeWorkerRendering();

        // Cleanup controllers
        keyboardHandler.detach();
        panelManager.destroy();
        uiController.destroy();

        // Dispose adapter
        adapter.dispose();

        // Restore UI state
        Sounds.switchBgm('main');
    };

    // Game end handler
    const onGameEnded = (data: unknown) => {
        const endData = data as { winnerId?: string; reason?: string };
        console.log('[MultiplayerBattle] Game ended:', endData);

        const isWinner = endData.winnerId === client.playerId;
        const message = isWinner ? '恭喜你获得胜利！' : '你输了，再接再厉！';

        gameController.gameEnd = true;
        cleanup();

        showGameEndModal({
            isWinner,
            message,
            onReturnToLobby: () => gotoPage('multiplayer-lobby-interface')
        });
    };

    // Player eliminated handler
    const onPlayerEliminated = (data: unknown) => {
        const elimData = data as { playerId?: string };
        if (elimData.playerId === client.playerId) {
            console.log('[MultiplayerBattle] Local player eliminated');
            gameController.gameEnd = true;
            cleanup();
            showGameEndModal({
                isWinner: false,
                message: '你的基地被摧毁了！',
                onReturnToLobby: () => gotoPage('multiplayer-lobby-interface')
            });
        }
    };

    // Create game controller
    const gameController = new MultiplayerGameController(
        adapter,
        renderer,
        canvasEle,
        {
            onGameEnd: cleanup,
            updateZoomLevel: () => uiController.updateZoomLevel()
        }
    );

    // Create UI controller
    const uiController = new MultiplayerUIController(
        worldFacade,
        canvasEle,
        gameController,
        client,
        {
            onBackClick: () => {
                gameController.gameEnd = true;
            },
            requestPauseRender: () => {
                gameController.requestRender();
            }
        }
    );
    uiController.init();
    uiController.initInputHandler();

    // Create keyboard handler (limited functionality in multiplayer)
    // WorldFacade bridges NetworkWorldAdapter to World-like interface for KeyboardHandler
    const keyboardHandler = new KeyboardHandler(worldFacade as unknown as World, {
        togglePause: () => {
            // No pause in multiplayer
            console.log('[MultiplayerBattle] Pause not available in multiplayer');
        },
        getIsGamePause: () => false // Always false in multiplayer
    });
    keyboardHandler.attach();

    // Create panel manager with network client
    const panelManager = new PanelManager(
        worldFacade,
        canvasEle,
        sessionId,
        uiController.getEventSignal(),
        {
            requestPauseRender: () => gameController.requestRender(),
            getGameEnd: () => gameController.gameEnd
        },
        client // Pass network client for multiplayer operations
    );
    panelManager.init();

    // Subscribe to game events
    client.events.on(NetworkEvent.GAME_ENDED, onGameEnded);
    client.events.on(NetworkEvent.PLAYER_ELIMINATED, onPlayerEliminated);

    // Start game loop
    gameController.start();

    console.log('[MultiplayerBattle] Game started successfully');
}
