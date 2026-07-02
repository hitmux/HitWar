/**
 * Game End Modal Component
 * Displays game result with better UX than alert()
 */

export interface GameEndOptions {
  isWinner: boolean;
  message: string;
  onReturnToLobby: () => void;
  onPlayAgain?: () => void;
}

export class GameEndModal {
  private modalElement: HTMLElement | null = null;

  show(options: GameEndOptions): void {
    this.hide(); // Remove existing modal if any

    const modal = this.createModal(options);
    document.body.appendChild(modal);
    this.modalElement = modal;

    // Trigger animation
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });
  }

  hide(): void {
    if (this.modalElement) {
      this.modalElement.classList.remove('show');
      setTimeout(() => {
        this.modalElement?.remove();
        this.modalElement = null;
      }, 300);
    }
  }

  private createModal(options: GameEndOptions): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'game-end-modal';

    const content = document.createElement('div');
    content.className = 'game-end-content';

    // Result icon
    const icon = document.createElement('div');
    icon.className = `game-end-icon ${options.isWinner ? 'victory' : 'defeat'}`;
    icon.textContent = options.isWinner ? '🎉' : '💥';

    // Title
    const title = document.createElement('h2');
    title.className = 'game-end-title';
    title.textContent = options.isWinner ? '胜利！' : '失败';

    // Message
    const message = document.createElement('p');
    message.className = 'game-end-message';
    message.textContent = options.message;

    // Buttons container
    const buttons = document.createElement('div');
    buttons.className = 'game-end-buttons';

    // Return to lobby button
    const lobbyBtn = document.createElement('button');
    lobbyBtn.className = 'game-end-btn primary';
    lobbyBtn.textContent = '返回大厅';
    lobbyBtn.onclick = () => {
      this.hide();
      options.onReturnToLobby();
    };

    buttons.appendChild(lobbyBtn);

    // Play again button (optional)
    if (options.onPlayAgain) {
      const playAgainBtn = document.createElement('button');
      playAgainBtn.className = 'game-end-btn secondary';
      playAgainBtn.textContent = '再来一局';
      playAgainBtn.onclick = () => {
        this.hide();
        options.onPlayAgain!();
      };
      buttons.appendChild(playAgainBtn);
    }

    content.appendChild(icon);
    content.appendChild(title);
    content.appendChild(message);
    content.appendChild(buttons);
    modal.appendChild(content);

    return modal;
  }
}

// Singleton instance
let modalInstance: GameEndModal | null = null;

export function showGameEndModal(options: GameEndOptions): void {
  if (!modalInstance) {
    modalInstance = new GameEndModal();
  }
  modalInstance.show(options);
}

export function hideGameEndModal(): void {
  modalInstance?.hide();
}
