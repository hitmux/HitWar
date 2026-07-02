/**
 * Waiting Room Interface
 * Shows player list and ready status before game starts
 */

import { gotoPage } from '../../navigation/router';
import { setupBackButton } from '../../components/backButton';
import {
  getNetworkClient,
  NetworkEvent,
  ConnectionState,
} from '@/network/networkClient';
import { startMultiplayerBattleMode } from '../battle';
import { PLAYER_COLORS, type PlayerDisplayInfo } from './types';
import { lobbyInterface } from './lobbyInterface';

/**
 * Initialize waiting room interface
 */
export function waitingRoomInterface(): void {
  const container = document.querySelector(
    '.multiplayer-waiting-interface'
  ) as HTMLElement;
  if (!container) return;

  const client = getNetworkClient();

  // Get elements
  const roomInfoDisplay = container.querySelector('#waitingRoomInfo') as HTMLElement;
  const playerListContainer = container.querySelector(
    '#waitingPlayerList'
  ) as HTMLElement;
  const readyBtn = container.querySelector('#readyBtn') as HTMLButtonElement;
  const waitingHint = container.querySelector('#waitingHint') as HTMLElement;
  const countdownDisplay = container.querySelector(
    '#gameCountdown'
  ) as HTMLElement;

  // State
  let isReady = false;
  let players: PlayerDisplayInfo[] = [];

  // Setup back button (leave room)
  setupBackButton(container, 'multiplayer-lobby-interface', {
    beforeNavigate: () => {
      cleanup();
      client.leaveGame();
      lobbyInterface();
    },
  });

  // Render player list
  const renderPlayerList = () => {
    const maxPlayers = 2; // Default to 2 players

    let html = '';
    for (let i = 0; i < maxPlayers; i++) {
      const player = players[i];
      const color = PLAYER_COLORS[i] || '#888';

      if (player) {
        const isMe = player.id === client.playerId;
        const readyStatus = player.isReady ? '✓ 已准备' : '等待中...';
        const readyClass = player.isReady ? 'ready' : 'waiting';
        const hostBadge = player.isHost ? '<span class="host-badge">房主</span>' : '';

        html += `
          <div class="player-slot filled ${readyClass}">
            <div class="player-number">玩家 ${i + 1}</div>
            <div class="player-card">
              <div class="player-avatar" style="background-color: ${color}"></div>
              <div class="player-info">
                <span class="player-name">${escapeHtml(player.name)}${isMe ? ' (你)' : ''}</span>
                ${hostBadge}
              </div>
              <span class="player-status ${readyClass}">${readyStatus}</span>
            </div>
          </div>
        `;
      } else {
        html += `
          <div class="player-slot empty">
            <div class="player-number">玩家 ${i + 1}</div>
            <div class="player-card">
              <div class="player-avatar empty" style="background-color: ${color}"></div>
              <div class="player-info">
                <span class="player-name">等待加入...</span>
              </div>
            </div>
          </div>
        `;
      }
    }

    playerListContainer.innerHTML = html;
  };

  // Update ready button
  const updateReadyButton = () => {
    if (isReady) {
      readyBtn.textContent = '取消准备';
      readyBtn.classList.add('ready');
    } else {
      readyBtn.textContent = '准备';
      readyBtn.classList.remove('ready');
    }
  };

  // Toggle ready state
  const toggleReady = () => {
    isReady = !isReady;
    client.setReady(isReady);
    updateReadyButton();
  };

  // Update room info
  const updateRoomInfo = (state: unknown) => {
    // Extract room info from state
    // The actual structure depends on server implementation
    if (state && typeof state === 'object') {
      const s = state as {
        roomName?: string;
        mapSize?: string;
        players?: Map<string, unknown> | Record<string, unknown>;
      };
      const roomName = s.roomName || '游戏房间';
      const mapSize = s.mapSize || 'medium';
      const mapSizeLabel =
        mapSize === 'small' ? '小型地图' : mapSize === 'large' ? '大型地图' : '中型地图';

      roomInfoDisplay.innerHTML = `房间: ${escapeHtml(roomName)} (${mapSizeLabel})`;

      // Update players from state
      if (s.players) {
        const playersMap = s.players instanceof Map ? s.players : new Map(Object.entries(s.players));
        players = [];
        let index = 0;
        playersMap.forEach((playerData: unknown, playerId: string) => {
          if (playerData && typeof playerData === 'object') {
            const p = playerData as {
              name?: string;
              isHost?: boolean;
              isReady?: boolean;
            };
            players.push({
              id: playerId,
              name: p.name || 'Player',
              isHost: p.isHost || false,
              isReady: p.isReady || false,
              color: PLAYER_COLORS[index] || '#888',
            });
            index++;
          }
        });
        renderPlayerList();
      }
    }
  };

  // Show countdown
  const showCountdown = (seconds: number) => {
    countdownDisplay.style.display = 'block';
    countdownDisplay.textContent = `游戏将在 ${seconds} 秒后开始...`;
    waitingHint.style.display = 'none';
  };

  // Event handlers
  const onStateChanged = (...args: unknown[]) => {
    const { newState } = args[0] as {
      oldState: ConnectionState;
      newState: ConnectionState;
    };
    if (newState === ConnectionState.CONNECTED_LOBBY) {
      // Kicked or left
      cleanup();
      gotoPage('multiplayer-lobby-interface');
      lobbyInterface();
    } else if (newState === ConnectionState.DISCONNECTED) {
      cleanup();
      gotoPage('multiplayer-connect-interface');
    }
  };

  const onGameStateChanged = (...args: unknown[]) => {
    updateRoomInfo(args[0]);
  };

  const onPlayerJoined = (...args: unknown[]) => {
    const data = args[0] as { playerId: string; playerName: string };
    console.log(`[WaitingRoom] Player joined: ${data.playerName}`);
    // State change will update the list
  };

  const onPlayerLeft = (...args: unknown[]) => {
    const data = args[0] as { playerId: string };
    console.log(`[WaitingRoom] Player left: ${data.playerId}`);
    // State change will update the list
  };

  const onGameStarting = (...args: unknown[]) => {
    const data = args[0] as { countdown: number };
    showCountdown(data.countdown);
  };

  const onGameStarted = () => {
    cleanup();
    // Navigate to game interface
    gotoPage('war-interface');
    // Start multiplayer battle mode
    startMultiplayerBattleMode();
  };

  const onError = (error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : '未知错误';
    waitingHint.textContent = '错误: ' + message;
    waitingHint.className = 'waiting-hint error';
  };

  // Setup event listeners
  client.events.on(NetworkEvent.STATE_CHANGED, onStateChanged);
  client.events.on(NetworkEvent.GAME_STATE_CHANGED, onGameStateChanged);
  client.events.on(NetworkEvent.PLAYER_JOINED, onPlayerJoined);
  client.events.on(NetworkEvent.PLAYER_LEFT, onPlayerLeft);
  client.events.on(NetworkEvent.GAME_STARTING, onGameStarting);
  client.events.on(NetworkEvent.GAME_STARTED, onGameStarted);
  client.events.on(NetworkEvent.ERROR, onError);

  // Button listeners
  readyBtn.addEventListener('click', toggleReady);

  // Initial render
  renderPlayerList();
  updateReadyButton();

  // Get initial state
  const gameState = client.gameState;
  if (gameState) {
    updateRoomInfo(gameState);
  }

  // Cleanup function
  function cleanup() {
    isReady = false;
    players = [];
    client.events.off(NetworkEvent.STATE_CHANGED, onStateChanged);
    client.events.off(NetworkEvent.GAME_STATE_CHANGED, onGameStateChanged);
    client.events.off(NetworkEvent.PLAYER_JOINED, onPlayerJoined);
    client.events.off(NetworkEvent.PLAYER_LEFT, onPlayerLeft);
    client.events.off(NetworkEvent.GAME_STARTING, onGameStarting);
    client.events.off(NetworkEvent.GAME_STARTED, onGameStarted);
    client.events.off(NetworkEvent.ERROR, onError);
  }
}

// Utility function to escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
