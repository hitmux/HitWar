/**
 * Connect Interface
 * Handles player name input and server connection
 */

import { gotoPage } from '../../navigation/router';
import { setupBackButton } from '../../components/backButton';
import { getNetworkClient, NetworkEvent } from '@/network/networkClient';
import { NETWORK_CONFIG } from '@/network/config';
import { lobbyInterface } from './lobbyInterface';

// LocalStorage keys
const STORAGE_KEY_PLAYER_NAME = 'multiplayer_playerName';
const STORAGE_KEY_SERVER_URL = 'multiplayer_serverUrl';

/**
 * Initialize connect interface
 */
export function connectInterface(): void {
  const container = document.querySelector('.multiplayer-connect-interface') as HTMLElement;
  if (!container) return;

  // Setup back button
  setupBackButton(container, 'main-interface');

  // Get elements
  const playerNameInput = container.querySelector('#playerNameInput') as HTMLInputElement;
  const serverUrlInput = container.querySelector('#serverUrlInput') as HTMLInputElement;
  const connectBtn = container.querySelector('#connectBtn') as HTMLButtonElement;
  const connectionStatus = container.querySelector('#connectionStatus') as HTMLElement;

  // Load saved values
  const savedName = localStorage.getItem(STORAGE_KEY_PLAYER_NAME) || '';
  const savedUrl = localStorage.getItem(STORAGE_KEY_SERVER_URL) || NETWORK_CONFIG.serverUrl;

  playerNameInput.value = savedName;
  serverUrlInput.value = savedUrl;

  // Update status display
  const updateStatus = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    connectionStatus.textContent = text;
    connectionStatus.className = 'connection-status ' + type;
  };

  // Handle connect
  const handleConnect = async () => {
    const playerName = playerNameInput.value.trim();
    const serverUrl = serverUrlInput.value.trim();

    if (!playerName) {
      updateStatus('请输入玩家名称', 'error');
      playerNameInput.focus();
      return;
    }

    if (playerName.length > 20) {
      updateStatus('玩家名称不能超过20个字符', 'error');
      return;
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY_PLAYER_NAME, playerName);
    localStorage.setItem(STORAGE_KEY_SERVER_URL, serverUrl);

    // Update network config if URL changed
    if (serverUrl !== NETWORK_CONFIG.serverUrl) {
      // Note: In production, this would need to recreate the client
      console.log(`[ConnectInterface] Custom server URL: ${serverUrl}`);
    }

    // Disable button and show connecting status
    connectBtn.disabled = true;
    updateStatus('正在连接...', 'info');

    const client = getNetworkClient();

    try {
      // Setup event listeners
      const onError = (error: unknown) => {
        console.error('[ConnectInterface] Connection error:', error);
        updateStatus('连接失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error');
        connectBtn.disabled = false;
      };

      const onConnected = () => {
        updateStatus('连接成功!', 'success');
        // Navigate to lobby
        gotoPage('multiplayer-lobby-interface');
        lobbyInterface();
        // Cleanup listeners
        client.events.off(NetworkEvent.ERROR, onError);
        client.events.off(NetworkEvent.CONNECTED, onConnected);
      };

      client.events.on(NetworkEvent.ERROR, onError);
      client.events.on(NetworkEvent.CONNECTED, onConnected);

      await client.connectToLobby(playerName);
    } catch (error) {
      updateStatus('连接失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error');
      connectBtn.disabled = false;
    }
  };

  // Event listeners
  connectBtn.addEventListener('click', handleConnect);

  // Allow pressing Enter to connect
  playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleConnect();
  });
  serverUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleConnect();
  });

  // Initial status
  updateStatus('未连接', 'info');
}
