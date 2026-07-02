/**
 * SpawnerPanel - UI panel for MonsterSpawner building
 *
 * Displays available monsters and allows spawning them against enemy players.
 */

import type { MonsterSpawner } from '../../../buildings/variants/monsterSpawner';
import { SPAWNABLE_MONSTERS, SpawnableMonster } from '../../../buildings/spawnerConfig';
import { scalePeriod } from '../../../core/speedScale';

/**
 * SpawnerPanel class - Manages the monster spawner UI
 */
export class SpawnerPanel {
    private panelEl: HTMLElement | null = null;
    private currentSpawner: MonsterSpawner | null = null;
    private refreshInterval: ReturnType<typeof setInterval> | null = null;
    private selectedTargetId: string = '';
    private abortSignal: AbortSignal;

    constructor(abortSignal: AbortSignal) {
        this.abortSignal = abortSignal;
        this.createPanel();
    }

    /**
     * Create panel DOM element
     */
    private createPanel(): void {
        // Create panel container
        this.panelEl = document.createElement('div');
        this.panelEl.id = 'spawnerPanel';
        this.panelEl.style.display = 'none';

        this.panelEl.innerHTML = `
            <div class="spawner-header">
                <span class="spawner-title">怪物生成塔</span>
                <span class="spawner-close">&times;</span>
            </div>
            <div class="spawner-target-section">
                <label>目标玩家：</label>
                <select class="spawner-target-select">
                    <option value="">选择目标</option>
                </select>
            </div>
            <div class="spawner-monster-list"></div>
            <div class="spawner-hint"></div>
        `;

        document.body.appendChild(this.panelEl);

        // Bind close button
        const closeBtn = this.panelEl.querySelector('.spawner-close');
        closeBtn?.addEventListener('click', () => this.hide(), { signal: this.abortSignal });

        // Bind target select
        const targetSelect = this.panelEl.querySelector('.spawner-target-select') as HTMLSelectElement;
        targetSelect?.addEventListener('change', (e) => {
            this.selectedTargetId = (e.target as HTMLSelectElement).value;
            this.updateMonsterList();
        }, { signal: this.abortSignal });

        // Hide when mouse leaves
        this.panelEl.addEventListener('mouseleave', () => {
            this.hide();
        }, { signal: this.abortSignal });
    }

    /**
     * Show panel for a spawner
     */
    show(spawner: MonsterSpawner, screenPos: { x: number; y: number }): void {
        if (!this.panelEl) return;

        this.currentSpawner = spawner;
        this.selectedTargetId = '';

        // Position panel
        this.panelEl.style.left = `${screenPos.x + 10}px`;
        this.panelEl.style.top = `${screenPos.y + 10}px`;
        this.panelEl.style.display = 'block';

        // Check multiplayer mode
        if (!spawner.isMultiplayerMode()) {
            this.showSinglePlayerMessage();
            return;
        }

        // Update target player dropdown
        this.updateTargetSelect();

        // Update monster list
        this.updateMonsterList();

        // Start refresh interval (200ms)
        this.startRefresh();
    }

    /**
     * Hide panel
     */
    hide(): void {
        if (!this.panelEl) return;

        this.panelEl.style.display = 'none';
        this.currentSpawner = null;
        this.stopRefresh();
    }

    /**
     * Check if panel is visible
     */
    isVisible(): boolean {
        return this.panelEl?.style.display === 'block';
    }

    /**
     * Show single player mode message
     */
    private showSinglePlayerMessage(): void {
        if (!this.panelEl) return;

        const targetSection = this.panelEl.querySelector('.spawner-target-section') as HTMLElement;
        const monsterList = this.panelEl.querySelector('.spawner-monster-list') as HTMLElement;
        const hintEl = this.panelEl.querySelector('.spawner-hint') as HTMLElement;

        if (targetSection) targetSection.style.display = 'none';
        if (monsterList) monsterList.innerHTML = '';
        if (hintEl) {
            hintEl.textContent = '仅在多人模式可用';
            hintEl.style.display = 'block';
        }
    }

    /**
     * Update target player dropdown
     */
    private updateTargetSelect(): void {
        if (!this.panelEl || !this.currentSpawner) return;

        const targetSection = this.panelEl.querySelector('.spawner-target-section') as HTMLElement;
        const selectEl = this.panelEl.querySelector('.spawner-target-select') as HTMLSelectElement;
        const hintEl = this.panelEl.querySelector('.spawner-hint') as HTMLElement;

        if (targetSection) targetSection.style.display = 'block';

        // Get enemy players
        const enemies = this.currentSpawner.getEnemyPlayers();

        if (enemies.length === 0) {
            if (hintEl) {
                hintEl.textContent = '没有可攻击的敌方玩家';
                hintEl.style.display = 'block';
            }
            if (selectEl) selectEl.innerHTML = '<option value="">无目标</option>';
            return;
        }

        if (hintEl) hintEl.style.display = 'none';

        // Build options
        let html = '<option value="">选择目标</option>';
        for (const enemy of enemies) {
            html += `<option value="${enemy.id}">${enemy.name}</option>`;
        }
        if (selectEl) {
            selectEl.innerHTML = html;
            selectEl.value = this.selectedTargetId;
        }
    }

    /**
     * Update monster list display
     */
    private updateMonsterList(): void {
        if (!this.panelEl || !this.currentSpawner) return;

        const listEl = this.panelEl.querySelector('.spawner-monster-list') as HTMLElement;
        if (!listEl) return;

        const spawner = this.currentSpawner;
        const currentWave = spawner.getCurrentWave();

        let html = '';
        for (const config of SPAWNABLE_MONSTERS) {
            const isUnlocked = currentWave >= config.unlockWave;
            const cooldown = spawner.getCooldown(config.monsterId);
            const isOnCooldown = cooldown > 0;
            const canAfford = spawner.canAfford(config);
            const hasTarget = this.selectedTargetId !== '';
            const inValidTerritory = spawner.inValidTerritory;

            const isAvailable = isUnlocked && !isOnCooldown && canAfford && hasTarget && inValidTerritory;

            let statusText = '';
            if (!isUnlocked) {
                statusText = `第${config.unlockWave}波解锁`;
            } else if (!inValidTerritory) {
                statusText = '领地无效';
            } else if (isOnCooldown) {
                // Convert ticks to seconds (approx)
                const seconds = Math.ceil(cooldown / scalePeriod(60));
                statusText = `冷却中 ${seconds}s`;
            } else if (!canAfford) {
                statusText = '金币不足';
            } else if (!hasTarget) {
                statusText = '请选择目标';
            }

            const itemClass = isAvailable ? 'spawner-monster-item available' : 'spawner-monster-item disabled';

            html += `
                <div class="${itemClass}" data-monster-id="${config.monsterId}">
                    <div class="monster-name">${config.name}</div>
                    <div class="monster-cost">${config.cost}元</div>
                    <div class="monster-status">${statusText}</div>
                </div>
            `;
        }

        listEl.innerHTML = html;

        // Bind click handlers
        const items = listEl.querySelectorAll('.spawner-monster-item.available');
        items.forEach((item) => {
            item.addEventListener('click', (e) => {
                const monsterId = (e.currentTarget as HTMLElement).dataset.monsterId;
                if (monsterId) {
                    this.spawnMonster(monsterId);
                }
            }, { signal: this.abortSignal });
        });
    }

    /**
     * Spawn a monster
     */
    private spawnMonster(monsterId: string): void {
        if (!this.currentSpawner || !this.selectedTargetId) return;

        const config = SPAWNABLE_MONSTERS.find(c => c.monsterId === monsterId);
        if (!config) return;

        const success = this.currentSpawner.spawnMonster(config, this.selectedTargetId);
        if (success) {
            // Refresh immediately to show cooldown
            this.updateMonsterList();
        }
    }

    /**
     * Start refresh interval
     */
    private startRefresh(): void {
        this.stopRefresh();
        this.refreshInterval = setInterval(() => {
            if (this.isVisible() && this.currentSpawner) {
                this.updateMonsterList();
            }
        }, 200);
    }

    /**
     * Stop refresh interval
     */
    private stopRefresh(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Cleanup
     */
    destroy(): void {
        this.stopRefresh();
        if (this.panelEl && this.panelEl.parentNode) {
            this.panelEl.parentNode.removeChild(this.panelEl);
        }
        this.panelEl = null;
    }
}
