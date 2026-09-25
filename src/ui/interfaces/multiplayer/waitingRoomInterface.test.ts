import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkEvent } from '@/network/networkClient';
import { waitingRoomInterface } from './waitingRoomInterface';

type Listener = (...args: unknown[]) => void;

const networkMock = vi.hoisted(() => {
  const listeners = new Map<string, Set<Listener>>();
  return {
    client: {
      playerId: 'alice-session',
      gameState: null as unknown,
      setReady: vi.fn(),
      leaveGame: vi.fn(),
      events: {
        on: vi.fn((event: string, listener: Listener) => {
          const eventListeners = listeners.get(event) ?? new Set<Listener>();
          eventListeners.add(listener);
          listeners.set(event, eventListeners);
        }),
        off: vi.fn((event: string, listener: Listener) => {
          listeners.get(event)?.delete(listener);
        }),
        emit(event: string, payload?: unknown) {
          for (const listener of listeners.get(event) ?? []) {
            listener(payload);
          }
        },
      },
    },
    reset() {
      listeners.clear();
      this.client.gameState = null;
      this.client.setReady.mockReset();
      this.client.leaveGame.mockReset();
      this.client.events.on.mockClear();
      this.client.events.off.mockClear();
    },
  };
});

vi.mock('@/network/networkClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/network/networkClient')>();
  return {
    ...actual,
    getNetworkClient: () => networkMock.client,
  };
});

vi.mock('../../navigation/router', () => ({
  gotoPage: vi.fn(),
}));

vi.mock('../../components/backButton', () => ({
  setupBackButton: vi.fn(),
}));

vi.mock('../battle', () => ({
  startMultiplayerBattleMode: vi.fn(),
}));

vi.mock('./lobbyInterface', () => ({
  lobbyInterface: vi.fn(),
}));

class FakeElement {
  private rawHtml = '';
  textContent = '';
  className = '';
  style: Record<string, string> = {};
  classList = {
    add: vi.fn(),
    remove: vi.fn(),
  };
  listeners = new Map<string, Listener>();
  children = new Map<string, FakeElement>();

  get innerHTML(): string {
    if (this.rawHtml) return this.rawHtml;
    return this.textContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  set innerHTML(value: string) {
    this.rawHtml = value;
  }

  querySelector(selector: string): FakeElement | null {
    return this.children.get(selector) ?? null;
  }

  addEventListener(event: string, listener: Listener): void {
    this.listeners.set(event, listener);
  }
}

function createWaitingRoomDom() {
  const container = new FakeElement();
  const elements = {
    roomInfo: new FakeElement(),
    playerList: new FakeElement(),
    readyBtn: new FakeElement(),
    waitingHint: new FakeElement(),
    countdown: new FakeElement(),
  };

  container.children.set('#waitingRoomInfo', elements.roomInfo);
  container.children.set('#waitingPlayerList', elements.playerList);
  container.children.set('#readyBtn', elements.readyBtn);
  container.children.set('#waitingHint', elements.waitingHint);
  container.children.set('#gameCountdown', elements.countdown);

  vi.stubGlobal('document', {
    querySelector: vi.fn((selector: string) => (
      selector === '.multiplayer-waiting-interface' ? container : null
    )),
    createElement: vi.fn(() => new FakeElement()),
  });

  return { container, elements };
}

describe('waitingRoomInterface', () => {
  beforeEach(() => {
    networkMock.reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses countdownSeconds, supports countdown fallback, and resets when state returns to waiting', () => {
    const { elements } = createWaitingRoomDom();

    waitingRoomInterface();

    networkMock.client.events.emit(NetworkEvent.GAME_STARTING, { countdownSeconds: 3 });
    expect(elements.countdown.style.display).toBe('block');
    expect(elements.countdown.textContent).toBe('游戏将在 3 秒后开始...');
    expect(elements.waitingHint.style.display).toBe('none');

    networkMock.client.events.emit(NetworkEvent.GAME_STARTING, { countdown: 2 });
    expect(elements.countdown.textContent).toBe('游戏将在 2 秒后开始...');

    networkMock.client.events.emit(NetworkEvent.GAME_STATE_CHANGED, {
      phase: 'waiting',
      players: new Map(),
    });
    expect(elements.countdown.style.display).toBe('none');
    expect(elements.countdown.textContent).toBe('');
    expect(elements.waitingHint.style.display).toBe('block');
  });
});
