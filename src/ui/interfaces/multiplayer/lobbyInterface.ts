/**
 * Lobby Interface
 * Displays room list and provides room creation/joining functionality
 */

import { gotoPage } from '../../navigation/router';
import { setupBackButton } from '../../components/backButton';
import {
  getNetworkClient,
  NetworkEvent,
  ConnectionState,
} from '@/network/networkClient';
import type { RoomInfo } from '@/network/messages';
import { waitingRoomInterface } from './waitingRoomInterface';

// Room list refresh interval (ms)
const REFRESH_INTERVAL = 5000;

let refreshIntervalId: number | null = null;
let isSearching = false;

/**
 * Initialize lobby interface
 */
export function lobbyInterface(): void {
  const container = document.querySelector(
    '.multiplayer-lobby-interface'
  ) as HTMLElement;
  if (!container) return;

  const client = getNetworkClient();

  // Reset module-level state to prevent stale data on re-entry
  if (refreshIntervalId !== null) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
  isSearching = false;

  // Setup back button (disconnect and return)
  setupBackButton(container, 'multiplayer-connect-interface', {
    beforeNavigate: () => {
      cleanup();
      client.disconnect();
    },
  });

  // Get elements
  const playerNameDisplay = container.querySelector(
    '#lobbyPlayerName'
  ) as HTMLElement;
  const roomListContainer = container.querySelector(
    '#roomListContainer'
  ) as HTMLElement;
  const refreshBtn = container.querySelector('#refreshRoomsBtn') as HTMLButtonElement;
  const createRoomBtn = container.querySelector(
    '#createRoomBtn'
  ) as HTMLButtonElement;
  const quickMatchBtn = container.querySelector(
    '#quickMatchBtn'
  ) as HTMLButtonElement;
  const matchStatus = container.querySelector('#matchStatus') as HTMLElement;

  // Create room dialog elements
  const createRoomDialog = container.querySelector(
    '#createRoomDialog'
  ) as HTMLElement;
  const roomNameInput = container.querySelector(
    '#roomNameInput'
  ) as HTMLInputElement;
  const mapSizeRadios = container.querySelectorAll(
    'input[name="mapSize"]'
  ) as NodeListOf<HTMLInputElement>;
  const privateRoomCheckbox = container.querySelector(
    '#privateRoomCheckbox'
  ) as HTMLInputElement;
  const confirmCreateBtn = container.querySelector(
    '#confirmCreateRoom'
  ) as HTMLButtonElement;
  const cancelCreateBtn = container.querySelector(
    '#cancelCreateRoom'
  ) as HTMLButtonElement;

  // Display player name
  playerNameDisplay.textContent = client.playerName;

  // Room list data
  let rooms: RoomInfo[] = [];

  // Render room list
  const renderRoomList = () => {
    if (rooms.length === 0) {
      roomListContainer.innerHTML = `
        <div class="empty-room-list">
          暂无房间，创建一个吧！
        </div>
      `;
      return;
    }

    roomListContainer.innerHTML = rooms
      .map((room) => {
        const isFull = room.playerCount >= room.maxPlayers;
        const statusClass = isFull
          ? 'room-full'
          : room.isPrivate
            ? 'room-private'
            : 'room-available';
        const statusText = isFull
          ? '已满'
          : room.isPrivate
            ? '私密'
            : '加入';
        const icon = room.isPrivate ? '🔒' : '🎮';

        return `
        <div class="room-item ${statusClass}" data-room-id="${room.roomId}">
          <span class="room-icon">${icon}</span>
          <span class="room-name">${escapeHtml(room.roomName || room.roomId)}</span>
          <span class="room-players">(${room.playerCount}/${room.maxPlayers})</span>
          <button class="join-room-btn" ${isFull || room.isPrivate ? 'disabled' : ''}>
            ${statusText}
          </button>
        </div>
      `;
      })
      .join('');

    // Add click handlers for join buttons
    roomListContainer.querySelectorAll('.join-room-btn:not([disabled])').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const roomItem = (e.target as HTMLElement).closest('.room-item');
        if (roomItem) {
          const roomId = roomItem.getAttribute('data-room-id');
          if (roomId) joinRoom(roomId);
        }
      });
    });
  };

  // Join a room
  const joinRoom = async (roomId: string) => {
    updateMatchStatus('正在加入房间...', 'info');
    try {
      await client.joinRoom(roomId);
    } catch (error) {
      updateMatchStatus(
        '加入失败: ' + (error instanceof Error ? error.message : '未知错误'),
        'error'
      );
    }
  };

  // Update match status
  const updateMatchStatus = (
    text: string,
    type: 'info' | 'success' | 'error' = 'info'
  ) => {
    matchStatus.textContent = text;
    matchStatus.className = 'match-status ' + type;
  };

  // Refresh rooms
  const refreshRooms = () => {
    client.refreshRooms();
  };

  // Start quick match
  const startQuickMatch = () => {
    if (isSearching) {
      client.cancelSearch();
      isSearching = false;
      quickMatchBtn.textContent = '快速匹配';
      quickMatchBtn.classList.remove('searching');
      updateMatchStatus('--', 'info');
    } else {
      client.quickMatch();
      isSearching = true;
      quickMatchBtn.textContent = '取消匹配';
      quickMatchBtn.classList.add('searching');
      updateMatchStatus('正在匹配中...', 'info');
    }
  };

  // Show create room dialog
  const showCreateDialog = () => {
    roomNameInput.value = `${client.playerName}的房间`;
    (
      container.querySelector(
        'input[name="mapSize"][value="medium"]'
      ) as HTMLInputElement
    ).checked = true;
    privateRoomCheckbox.checked = false;
    createRoomDialog.style.display = 'flex';
  };

  // Hide create room dialog
  const hideCreateDialog = () => {
    createRoomDialog.style.display = 'none';
  };

  // Create room
  const createRoom = async () => {
    const roomName = roomNameInput.value.trim() || `${client.playerName}的房间`;
    let mapSize = 'medium';
    mapSizeRadios.forEach((radio) => {
      if (radio.checked) mapSize = radio.value;
    });
    const isPrivate = privateRoomCheckbox.checked;

    hideCreateDialog();
    updateMatchStatus('正在创建房间...', 'info');

    try {
      await client.createRoom({
        roomName,
        mapSize,
        isPrivate,
      });
    } catch (error) {
      updateMatchStatus(
        '创建失败: ' + (error instanceof Error ? error.message : '未知错误'),
        'error'
      );
    }
  };

  // Event handlers
  const onRoomsUpdated = (...args: unknown[]) => {
    const roomList = args[0] as RoomInfo[];
    rooms = roomList;
    renderRoomList();
  };

  const onMatchFound = () => {
    isSearching = false;
    quickMatchBtn.textContent = '快速匹配';
    quickMatchBtn.classList.remove('searching');
    updateMatchStatus('匹配成功!', 'success');
  };

  const onStateChanged = (...args: unknown[]) => {
    const { newState } = args[0] as {
      oldState: ConnectionState;
      newState: ConnectionState;
    };
    if (newState === ConnectionState.IN_GAME) {
      // Navigate to waiting room
      cleanup();
      gotoPage('multiplayer-waiting-interface');
      waitingRoomInterface();
    } else if (newState === ConnectionState.DISCONNECTED) {
      cleanup();
      gotoPage('multiplayer-connect-interface');
    }
  };

  const onError = (error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : '未知错误';
    updateMatchStatus('错误: ' + message, 'error');
  };

  // Setup event listeners
  client.events.on(NetworkEvent.ROOMS_UPDATED, onRoomsUpdated);
  client.events.on(NetworkEvent.MATCH_FOUND, onMatchFound);
  client.events.on(NetworkEvent.STATE_CHANGED, onStateChanged);
  client.events.on(NetworkEvent.ERROR, onError);

  // Button listeners
  refreshBtn.addEventListener('click', refreshRooms);
  createRoomBtn.addEventListener('click', showCreateDialog);
  quickMatchBtn.addEventListener('click', startQuickMatch);
  confirmCreateBtn.addEventListener('click', createRoom);
  cancelCreateBtn.addEventListener('click', hideCreateDialog);

  // Start auto-refresh
  refreshRooms();
  refreshIntervalId = window.setInterval(refreshRooms, REFRESH_INTERVAL);

  // Initial render
  renderRoomList();
  updateMatchStatus('--', 'info');

  // Cleanup function
  function cleanup() {
    if (refreshIntervalId !== null) {
      clearInterval(refreshIntervalId);
      refreshIntervalId = null;
    }
    isSearching = false;
    client.events.off(NetworkEvent.ROOMS_UPDATED, onRoomsUpdated);
    client.events.off(NetworkEvent.MATCH_FOUND, onMatchFound);
    client.events.off(NetworkEvent.STATE_CHANGED, onStateChanged);
    client.events.off(NetworkEvent.ERROR, onError);
  }
}

// Utility function to escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
