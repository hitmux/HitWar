/**
 * Cheat mode UI controller
 */

import { World } from '../../../game/world';

export interface CheatModeCallbacks {
    getIsGamePause: () => boolean;
    togglePause: () => void;
}

export class CheatModeUI {
    private world: World;
    private callbacks: CheatModeCallbacks;

    // DOM elements
    private toggleCheatBtn: HTMLButtonElement;
    private cheatMenu: HTMLElement;
    private cheatConfirmDialog: HTMLElement;
    private cheatModeIndicator: HTMLElement;
    private confirmCheatBtn: HTMLElement;
    private cancelCheatBtn: HTMLElement;
    private moneyBtns: NodeListOf<HTMLElement>;
    private customMoneyBtn: HTMLElement;
    private customMoneyDialog: HTMLElement;
    private customMoneyInput: HTMLInputElement;
    private confirmCustomMoney: HTMLElement;
    private cancelCustomMoney: HTMLElement;
    private priceMultBtns: NodeListOf<HTMLElement>;
    private infiniteHpCheckbox: HTMLInputElement;
    private disableEnergyCheckbox: HTMLInputElement;
    private toggleFogBtn: HTMLButtonElement;

    private cheatModeEnabled: boolean = false;
    private pausedBeforeCheat: boolean = false;

    constructor(world: World, callbacks: CheatModeCallbacks) {
        this.world = world;
        this.callbacks = callbacks;

        // Get DOM elements
        this.toggleCheatBtn = document.getElementById("toggleCheatBtn") as HTMLButtonElement;
        this.cheatMenu = document.getElementById("cheatMenu") as HTMLElement;
        this.cheatConfirmDialog = document.getElementById("cheatConfirmDialog") as HTMLElement;
        this.cheatModeIndicator = document.getElementById("cheatModeIndicator") as HTMLElement;
        this.confirmCheatBtn = document.getElementById("confirmCheat") as HTMLElement;
        this.cancelCheatBtn = document.getElementById("cancelCheat") as HTMLElement;
        this.moneyBtns = document.querySelectorAll('.cheatBtn[data-action="money"]') as NodeListOf<HTMLElement>;
        this.customMoneyBtn = document.getElementById("customMoneyBtn") as HTMLElement;
        this.customMoneyDialog = document.getElementById("customMoneyDialog") as HTMLElement;
        this.customMoneyInput = document.getElementById("customMoneyInput") as HTMLInputElement;
        this.confirmCustomMoney = document.getElementById("confirmCustomMoney") as HTMLElement;
        this.cancelCustomMoney = document.getElementById("cancelCustomMoney") as HTMLElement;
        this.priceMultBtns = document.querySelectorAll('.priceMultBtn') as NodeListOf<HTMLElement>;
        this.infiniteHpCheckbox = document.getElementById("infiniteHpCheckbox") as HTMLInputElement;
        this.disableEnergyCheckbox = document.getElementById("disableEnergyCheckbox") as HTMLInputElement;
        this.toggleFogBtn = document.getElementById("toggleFogBtn") as HTMLButtonElement;
    }

    /**
     * Initialize cheat mode UI and bind events
     */
    init(): void {
        // Reset UI state
        this.resetUI();

        // Bind events
        this.bindToggleButton();
        this.bindConfirmDialog();
        this.bindMoneyButtons();
        this.bindCustomMoneyDialog();
        this.bindPriceMultButtons();
        this.bindCheckboxes();
        this.bindFogButton();
    }

    /**
     * Reset UI to initial state
     */
    resetUI(): void {
        this.cheatModeEnabled = false;
        this.cheatMenu.style.display = "none";
        this.cheatConfirmDialog.style.display = "none";
        this.cheatModeIndicator.style.display = "none";
        this.toggleCheatBtn.classList.remove("active");
        this.toggleCheatBtn.textContent = "作弊模式";
        this.toggleCheatBtn.disabled = false;
    }

    /**
     * Restore UI state from world (after loading save)
     */
    restoreFromWorld(): void {
        if (this.world.cheatMode.enabled) {
            this.cheatModeEnabled = true;
            this.cheatMenu.style.display = "block";
            this.toggleCheatBtn.classList.add("active");
            this.toggleCheatBtn.textContent = "作弊模式已开启";
            this.toggleCheatBtn.disabled = true;
            this.cheatModeIndicator.style.display = "block";

            this.priceMultBtns.forEach(btn => {
                btn.classList.remove("active");
                if (parseFloat(btn.dataset.mult!) === this.world.cheatMode.priceMultiplier) {
                    btn.classList.add("active");
                }
            });
            this.infiniteHpCheckbox.checked = this.world.cheatMode.infiniteHp;
            this.disableEnergyCheckbox.checked = this.world.cheatMode.disableEnergy;
        }
    }

    private bindToggleButton(): void {
        this.toggleCheatBtn.addEventListener("click", () => {
            if (!this.cheatModeEnabled) {
                this.cheatConfirmDialog.style.display = "flex";
                this.pausedBeforeCheat = this.callbacks.getIsGamePause();
                if (!this.pausedBeforeCheat) {
                    this.callbacks.togglePause();
                }
            }
        });
    }

    private bindConfirmDialog(): void {
        this.confirmCheatBtn.addEventListener("click", () => {
            this.cheatModeEnabled = true;
            this.world.cheatMode.enabled = true;
            this.cheatConfirmDialog.style.display = "none";
            this.cheatMenu.style.display = "block";
            this.toggleCheatBtn.classList.add("active");
            this.toggleCheatBtn.textContent = "作弊模式已开启";
            this.toggleCheatBtn.disabled = true;
            this.cheatModeIndicator.style.display = "block";
            if (!this.pausedBeforeCheat && this.callbacks.getIsGamePause()) {
                this.callbacks.togglePause();
            }
        });

        this.cancelCheatBtn.addEventListener("click", () => {
            this.cheatConfirmDialog.style.display = "none";
            if (!this.pausedBeforeCheat && this.callbacks.getIsGamePause()) {
                this.callbacks.togglePause();
            }
        });
    }

    private bindMoneyButtons(): void {
        this.moneyBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const amount = parseInt(btn.dataset.value!);
                this.world.user.money += amount;
            });
        });
    }

    private bindCustomMoneyDialog(): void {
        this.customMoneyBtn.addEventListener("click", () => {
            this.customMoneyDialog.style.display = "flex";
            this.customMoneyInput.value = "";
            this.customMoneyInput.focus();
        });

        this.confirmCustomMoney.addEventListener("click", () => {
            const amount = parseInt(this.customMoneyInput.value);
            if (amount && amount > 0) {
                this.world.user.money += amount;
            }
            this.customMoneyDialog.style.display = "none";
        });

        this.cancelCustomMoney.addEventListener("click", () => {
            this.customMoneyDialog.style.display = "none";
        });
    }

    private bindPriceMultButtons(): void {
        // Set initial state
        this.priceMultBtns.forEach(btn => {
            if (parseFloat(btn.dataset.mult!) === 1.0) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // Bind click events
        this.priceMultBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                this.priceMultBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const mult = parseFloat(btn.dataset.mult!);
                this.world.cheatMode.priceMultiplier = mult;
            });
        });
    }

    private bindCheckboxes(): void {
        this.infiniteHpCheckbox.checked = false;
        this.infiniteHpCheckbox.addEventListener("change", () => {
            this.world.cheatMode.infiniteHp = this.infiniteHpCheckbox.checked;
        });

        this.disableEnergyCheckbox.checked = false;
        this.disableEnergyCheckbox.addEventListener("change", () => {
            this.world.cheatMode.disableEnergy = this.disableEnergyCheckbox.checked;
        });
    }

    private bindFogButton(): void {
        this.toggleFogBtn.textContent = "隐藏迷雾";
        this.toggleFogBtn.addEventListener("click", () => {
            this.world.fog.enabled = !this.world.fog.enabled;
            this.toggleFogBtn.textContent = this.world.fog.enabled ? "隐藏迷雾" : "显示迷雾";
            this.world.fog.renderer.invalidateCache();
        });
    }
}
