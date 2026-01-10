/**
 * Panel manager - handles tower/building selection, level up, and mine panels
 */

import { World } from '../../../game/world';
import { Vector } from '../../../core/math/vector';
import { EffectText } from '../../../effects/effect';
import { TowerFinallyCompat } from '../../../towers/index';
import { TOWER_IMG_WIDTH, TOWER_IMG_HEIGHT, TOWER_IMG_PRE_WIDTH, TOWER_IMG_PRE_HEIGHT } from '../../../towers/index';
import { TowerRegistry } from '../../../towers/towerRegistry';
import { getBuildingFuncArr } from '../../../buildings/index';
import { Mine } from '../../../systems/energy/mine';
import { VisionType } from '../../../systems/fog/visionConfig';
import type { GameEntity, CanvasWithInputHandler } from './types';

const BUILDING_FUNC_ARR = getBuildingFuncArr();
const LEVELUP_POOL_SIZE = 10;
const ICON_RATE = 0.5;

/**
 * Calculate image sprite position from index
 */
function getTowerImgPosition(imgIndex: number): { x: number; y: number } {
    const cols = Math.floor(TOWER_IMG_WIDTH / TOWER_IMG_PRE_WIDTH);
    const x = (imgIndex % cols) * TOWER_IMG_PRE_WIDTH;
    const y = Math.floor(imgIndex / cols) * TOWER_IMG_PRE_HEIGHT;
    return { x, y };
}

export interface PanelManagerCallbacks {
    requestPauseRender: () => void;
    getGameEnd: () => boolean;
}

export class PanelManager {
    private world: World;
    private canvasEle: CanvasWithInputHandler;
    private callbacks: PanelManagerCallbacks;
    private sessionId: string;
    private eventSignal: AbortSignal;

    // Panel DOM elements
    private choiceBtn: HTMLElement;
    private smallLevelUpPanelEle: HTMLElement;
    private listEle: HTMLElement;
    private otherItemsEle: HTMLElement;

    // DOM cache pool
    private levelUpItemPool: HTMLElement[] = [];
    private cachedLevelDownBtn!: HTMLElement;
    private cachedSellBtn!: HTMLElement;
    private cachedObserverBtn!: HTMLElement;
    private cachedRadarBtn!: HTMLElement;

    // Current panel state
    private currentPanelEntity: GameEntity | null = null;
    private currentClickPos: Vector | null = null;
    private currentPanelMine: Mine | null = null;
    private currentMineScreenPos: Vector | null = null;

    // Selection state
    private addedThingFunc: ((world: unknown) => GameEntity) | null = null;
    private selectedThing: GameEntity | null = null;
    private cachedBuilding: GameEntity | null = null;
    private lastAddedFunc: ((world: unknown) => GameEntity) | null = null;

    // RAF scheduling
    private pendingPanelRAF: number | null = null;
    private pendingPanelUpdate: (() => void) | null = null;

    // Intervals
    private refreshPanelInterval: ReturnType<typeof setInterval> | null = null;
    private freshBtnInterval: ReturnType<typeof setInterval> | null = null;

    constructor(
        world: World,
        canvasEle: CanvasWithInputHandler,
        sessionId: string,
        eventSignal: AbortSignal,
        callbacks: PanelManagerCallbacks
    ) {
        this.world = world;
        this.canvasEle = canvasEle;
        this.sessionId = sessionId;
        this.eventSignal = eventSignal;
        this.callbacks = callbacks;

        this.choiceBtn = document.querySelector(".choiceBtn") as HTMLElement;
        this.smallLevelUpPanelEle = document.querySelector("#smallLevelUpPanel") as HTMLElement;
        this.listEle = this.smallLevelUpPanelEle.querySelector(".levelUpItems") as HTMLElement;
        this.otherItemsEle = this.smallLevelUpPanelEle.querySelector(".otherItems") as HTMLElement;
    }

    /**
     * Initialize panel manager
     */
    init(): void {
        this.initDOMCache();
        this.bindCanvasEvents();
        this.bindLevelUpPanelEvents();
        this.startIntervals();
        this.setupRightClickHandler();
    }

    /**
     * Cleanup intervals and handlers
     */
    destroy(): void {
        if (this.refreshPanelInterval) {
            clearInterval(this.refreshPanelInterval);
        }
        if (this.freshBtnInterval) {
            clearInterval(this.freshBtnInterval);
        }
    }

    /**
     * Get current added thing function
     */
    getAddedThingFunc(): ((world: unknown) => GameEntity) | null {
        return this.addedThingFunc;
    }

    /**
     * Get current selected thing
     */
    getSelectedThing(): GameEntity | null {
        return this.selectedThing;
    }

    private schedulePanelUpdate(updateFn: () => void): void {
        this.pendingPanelUpdate = updateFn;
        if (this.pendingPanelRAF === null) {
            this.pendingPanelRAF = requestAnimationFrame(() => {
                this.pendingPanelRAF = null;
                if (this.pendingPanelUpdate) {
                    this.pendingPanelUpdate();
                    this.pendingPanelUpdate = null;
                }
            });
        }
    }

    private createLevelUpItem(): HTMLElement {
        const divLevelUpItemEle = document.createElement("div");
        divLevelUpItemEle.classList.add("levelUpItem");
        const nameDiv = document.createElement("div");
        nameDiv.classList.add("name");
        divLevelUpItemEle.appendChild(nameDiv);
        const imgDiv = document.createElement("div");
        imgDiv.classList.add("icon");
        imgDiv.style.backgroundImage = "url('/towers/imgs/towers.png')";
        imgDiv.style.backgroundSize = `${TOWER_IMG_WIDTH * ICON_RATE}px ${TOWER_IMG_HEIGHT * ICON_RATE}px`;
        imgDiv.style.width = TOWER_IMG_PRE_WIDTH * ICON_RATE + "px";
        imgDiv.style.height = TOWER_IMG_PRE_HEIGHT * ICON_RATE + "px";
        imgDiv.style.outline = "solid 1px";
        divLevelUpItemEle.appendChild(imgDiv);
        const priceDiv = document.createElement("div");
        priceDiv.classList.add("price");
        divLevelUpItemEle.appendChild(priceDiv);
        return divLevelUpItemEle;
    }

    private initDOMCache(): void {
        // Create level up item pool
        for (let i = 0; i < LEVELUP_POOL_SIZE; i++) {
            this.levelUpItemPool.push(this.createLevelUpItem());
        }

        // Create level down button
        this.cachedLevelDownBtn = document.createElement("div");
        this.cachedLevelDownBtn.classList.add("item", "levelDown");
        const iconDiv = document.createElement("div");
        iconDiv.classList.add("icon");
        this.cachedLevelDownBtn.appendChild(iconDiv);
        const textDiv = document.createElement("div");
        textDiv.classList.add("inner-text");
        this.cachedLevelDownBtn.appendChild(textDiv);

        // Create sell button
        this.cachedSellBtn = document.createElement("div");
        this.cachedSellBtn.classList.add("item", "sell");
        const sellIconDiv = document.createElement("div");
        sellIconDiv.classList.add("icon");
        this.cachedSellBtn.appendChild(sellIconDiv);
        const sellTextDiv = document.createElement("div");
        sellTextDiv.classList.add("inner-text");
        this.cachedSellBtn.appendChild(sellTextDiv);

        // Create observer vision upgrade button
        this.cachedObserverBtn = document.createElement("div");
        this.cachedObserverBtn.classList.add("item", "visionUpgrade", "observer");
        this.cachedObserverBtn.setAttribute("data-vision-type", VisionType.OBSERVER.toString());
        const observerIconDiv = document.createElement("div");
        observerIconDiv.classList.add("icon");
        observerIconDiv.textContent = "👁";
        this.cachedObserverBtn.appendChild(observerIconDiv);
        const observerTextDiv = document.createElement("div");
        observerTextDiv.classList.add("inner-text");
        this.cachedObserverBtn.appendChild(observerTextDiv);

        // Create radar vision upgrade button
        this.cachedRadarBtn = document.createElement("div");
        this.cachedRadarBtn.classList.add("item", "visionUpgrade", "radar");
        this.cachedRadarBtn.setAttribute("data-vision-type", VisionType.RADAR.toString());
        const radarIconDiv = document.createElement("div");
        radarIconDiv.classList.add("icon");
        radarIconDiv.textContent = "📡";
        this.cachedRadarBtn.appendChild(radarIconDiv);
        const radarTextDiv = document.createElement("div");
        radarTextDiv.classList.add("inner-text");
        this.cachedRadarBtn.appendChild(radarTextDiv);
    }

    private bindLevelUpPanelEvents(): void {
        // Event delegation for listEle
        this.listEle.addEventListener("click", (e) => {
            const target = (e.target as HTMLElement).closest(".levelUpItem") as HTMLElement | null;
            if (!target) return;

            // Handle tower upgrade
            if (this.currentPanelEntity && this.currentClickPos) {
                const price = parseInt(target.dataset.price!);
                const towerName = target.dataset.towerName!;
                if (this.world.user.money >= price) {
                    const pos = this.currentPanelEntity.pos.copy();
                    this.world.user.money -= this.currentPanelEntity.price;
                    const newThing = TowerRegistry.create(towerName, this.world) as GameEntity;
                    newThing.towerLevel = this.currentPanelEntity.towerLevel + 1;
                    newThing.pos = pos;
                    // Preserve vision attributes
                    newThing.visionType = this.currentPanelEntity.visionType;
                    newThing.visionLevel = this.currentPanelEntity.visionLevel;
                    newThing.radarAngle = this.currentPanelEntity.radarAngle;
                    this.world.addTower(newThing as any);
                    this.currentPanelEntity.remove();
                    this.showSmallLevelUpPanel(newThing, this.currentClickPos);
                } else {
                    const et = new EffectText("钱不够！");
                    et.pos = this.currentClickPos;
                    this.world.addEffect(et as any);
                }
                this.callbacks.requestPauseRender();
                return;
            }

            // Handle mine operations
            if (this.currentPanelMine && this.currentMineScreenPos) {
                const action = target.dataset.mineAction;
                const price = parseInt(target.dataset.price || "0");
                if (action === "upgrade" || action === "repair") {
                    if (this.world.user.money >= price) {
                        this.world.user.money -= price;
                        if (action === "upgrade") {
                            this.currentPanelMine.upgrade();
                        } else {
                            this.currentPanelMine.startRepair();
                        }
                        this.showMinePanel(this.currentPanelMine, this.currentMineScreenPos);
                    } else {
                        const et = new EffectText("钱不够！");
                        et.pos = this.currentPanelMine.pos.copy();
                        this.world.addEffect(et as any);
                    }
                }
                this.callbacks.requestPauseRender();
            }
        });

        // Event delegation for otherItemsEle
        this.otherItemsEle.addEventListener("click", (e) => {
            const target = (e.target as HTMLElement).closest(".item") as HTMLElement | null;
            if (!target) return;

            // Handle tower operations
            if (this.currentPanelEntity && this.currentClickPos) {
                if (target.classList.contains("levelDown")) {
                    const towerName = this.currentPanelEntity.levelDownGetter as string | null;
                    if (towerName === null) {
                        const et = new EffectText("无法降级！");
                        et.pos = this.currentClickPos;
                        this.world.addEffect(et as any);
                    } else {
                        const downObj = TowerRegistry.create(towerName, this.world) as GameEntity;
                        downObj.towerLevel = Math.max(1, this.currentPanelEntity.towerLevel - 1);
                        // Preserve vision attributes
                        downObj.visionType = this.currentPanelEntity.visionType;
                        downObj.visionLevel = this.currentPanelEntity.visionLevel;
                        downObj.radarAngle = this.currentPanelEntity.radarAngle;
                        this.world.user.money += this.currentPanelEntity.price / 4;
                        const newPos = this.currentPanelEntity.pos.copy();
                        this.currentPanelEntity.remove();
                        downObj.pos = newPos;
                        this.world.addTower(downObj as any);
                        this.showSmallLevelUpPanel(downObj, this.currentClickPos);
                    }
                } else if (target.classList.contains("sell")) {
                    const refund = this.currentPanelEntity.getSellRefund?.() ?? Math.floor(this.currentPanelEntity.price / 2);
                    this.world.user.money += refund;
                    this.currentPanelEntity.remove();
                    this.hideLevelUpPanel();
                } else if (target.classList.contains("visionUpgrade")) {
                    const visionType = (target.dataset.visionType || VisionType.NONE) as VisionType;
                    if (this.currentPanelEntity.canUpgradeVision?.(visionType)) {
                        const price = this.currentPanelEntity.getVisionUpgradePrice?.(visionType) ?? 0;
                        if (this.world.user.money >= price) {
                            this.currentPanelEntity.upgradeVision?.(visionType);
                            this.world.user.money -= price;
                            this.world.fog.markDirty();
                            this.showSmallLevelUpPanel(this.currentPanelEntity, this.currentClickPos);
                        } else {
                            const et = new EffectText("金币不足！");
                            et.pos = this.currentPanelEntity.pos.copy();
                            this.world.addEffect(et as any);
                        }
                    }
                }
                this.callbacks.requestPauseRender();
                return;
            }

            // Handle mine operations
            if (this.currentPanelMine && this.currentMineScreenPos) {
                if (target.classList.contains("levelDown")) {
                    const refund = parseInt(target.dataset.refund || "0");
                    this.world.user.money += refund;
                    this.currentPanelMine.downgrade();
                    this.showMinePanel(this.currentPanelMine, this.currentMineScreenPos);
                } else if (target.classList.contains("sell")) {
                    const sellPrice = parseInt(target.dataset.sellPrice || "0");
                    this.world.user.money += sellPrice;
                    this.currentPanelMine.destroy();
                    this.hideLevelUpPanel();
                }
                this.callbacks.requestPauseRender();
            }
        });

        // Mouse leave event
        this.smallLevelUpPanelEle.addEventListener("mouseleave", () => {
            this.hideLevelUpPanel();
        });
    }

    private showInitPanel(): void {
        const panelEle = document.querySelector(".initPanel") as HTMLElement & { dataset: { sessionId?: string } };

        if (panelEle.dataset.sessionId !== this.sessionId) {
            panelEle.innerHTML = "";
            panelEle.dataset.sessionId = this.sessionId;
            const thingsFuncArr: ((world: unknown) => GameEntity)[] = [];
            thingsFuncArr.push((TowerFinallyCompat as any).BasicCannon as (world: unknown) => GameEntity);
            for (const bF of BUILDING_FUNC_ARR) {
                thingsFuncArr.push(bF as (world: unknown) => GameEntity);
            }
            for (const bFunc of thingsFuncArr) {
                const btn = document.createElement('button');
                btn.classList.add("towerBtn");
                const b = bFunc(this.world);
                btn.innerHTML = b.name + `<br>${b.price}￥`;
                btn.classList.add(b.gameType);
                btn.setAttribute("data-price", b.price.toString());
                btn.addEventListener("click", () => {
                    this.addedThingFunc = bFunc;
                });
                panelEle.appendChild(btn);
            }
            const cancelBtn = document.createElement("button");
            cancelBtn.innerText = "取消放置模式";
            cancelBtn.id = "cancelSelect";
            cancelBtn.addEventListener("click", () => {
                this.addedThingFunc = null;
                this.world.user.putLoc.building = null;
                this.cachedBuilding = null;
                this.lastAddedFunc = null;
                this.callbacks.requestPauseRender();
            });
            panelEle.appendChild(cancelBtn);
        }

        if (panelEle.style.display === "block") {
            return;
        }
        this.hideAllPanel();
        panelEle.style.display = "block";
    }

    private showSelectedPanel(forceAble: boolean): void {
        const panelEle = document.querySelector(".choicePanel") as HTMLElement;
        if (panelEle.style.display === "block") {
            if (!forceAble) {
                return;
            }
        }
        this.hideAllPanel();
        panelEle.style.display = "block";
        if (panelEle.innerHTML !== "") {
            const hideAllData = () => {
                for (let i = 0; i < panelEle.children.length; i++) {
                    (panelEle.children[i] as HTMLElement).style.display = "none";
                }
            };
            if (this.selectedThing!.gameType === "Monster") {
                hideAllData();
                (panelEle.querySelector(".monsterData") as HTMLElement).style.display = "block";
                (panelEle.querySelector(".monsterName") as HTMLElement).innerHTML = this.selectedThing!.name;
                (panelEle.querySelector(".monsterComment") as HTMLElement).innerHTML = this.selectedThing!.comment || "";
            }
        }
    }

    private hideAllPanel(): void {
        for (let i = 0; i < this.choiceBtn.children.length; i++) {
            (this.choiceBtn.children[i] as HTMLElement).style.display = "none";
        }
    }

    private hideLevelUpPanel(): void {
        this.smallLevelUpPanelEle.style.display = "none";
    }

    showSmallLevelUpPanel(thing: GameEntity, clickPos: Vector): void {
        if (thing.inValidTerritory === false) {
            const et = new EffectText("无效领地内无法操作！");
            et.pos = thing.pos.copy();
            this.world.addEffect(et as any);
            this.callbacks.requestPauseRender();
            return;
        }

        this.currentPanelEntity = thing;
        this.currentClickPos = clickPos;
        this.currentPanelMine = null;
        this.currentMineScreenPos = null;

        this.schedulePanelUpdate(() => {
            this.smallLevelUpPanelEle.style.display = "block";
            this.smallLevelUpPanelEle.style.left = clickPos.x + 10 + "px";
            this.smallLevelUpPanelEle.style.top = clickPos.y + 10 + "px";
            const nameSpan = this.smallLevelUpPanelEle.querySelector(".name") as HTMLElement;
            nameSpan.innerHTML = thing.name;

            // Clear and rebuild using pool
            while (this.listEle.firstChild) {
                this.listEle.removeChild(this.listEle.firstChild);
            }

            if (thing.levelUpArr.length === 0) {
                const tips = document.createElement("p");
                tips.innerText = '这个建筑已经顶级啦！';
                this.listEle.appendChild(tips);
            } else {
                let index = 0;
                for (const towerName of thing.levelUpArr as string[]) {
                    const meta = TowerRegistry.getMeta(towerName);
                    if (!meta) continue;

                    let itemEle: HTMLElement;
                    if (index < this.levelUpItemPool.length) {
                        itemEle = this.levelUpItemPool[index];
                    } else {
                        itemEle = this.createLevelUpItem();
                        this.levelUpItemPool.push(itemEle);
                    }

                    const nameDiv = itemEle.querySelector(".name") as HTMLElement;
                    nameDiv.innerText = meta.name;
                    const imgDiv = itemEle.querySelector(".icon") as HTMLElement;
                    imgDiv.style.display = "";
                    const diffPos = getTowerImgPosition(meta.imgIndex);
                    imgDiv.style.backgroundPositionX = -diffPos.x * ICON_RATE + "px";
                    imgDiv.style.backgroundPositionY = -diffPos.y * ICON_RATE + "px";
                    const priceDiv = itemEle.querySelector(".price") as HTMLElement;
                    priceDiv.innerText = `${meta.basePrice}元`;

                    itemEle.setAttribute("data-price", meta.basePrice.toString());
                    itemEle.setAttribute("data-tower-name", towerName);

                    this.listEle.appendChild(itemEle);
                    index++;
                }
            }

            // Update other items
            while (this.otherItemsEle.firstChild) {
                this.otherItemsEle.removeChild(this.otherItemsEle.firstChild);
            }

            const levelDownText = this.cachedLevelDownBtn.querySelector(".inner-text") as HTMLElement;
            levelDownText.innerHTML = `降级<br>+${thing.price / 4}元`;
            this.otherItemsEle.appendChild(this.cachedLevelDownBtn);

            const sellText = this.cachedSellBtn.querySelector(".inner-text") as HTMLElement;
            const sellRefund = thing.getSellRefund?.() ?? Math.floor(thing.price / 2);
            sellText.innerHTML = `卖了<br>+${sellRefund}元`;
            this.otherItemsEle.appendChild(this.cachedSellBtn);

            // Vision upgrade buttons
            if (thing.gameType === "Tower") {
                if (thing.visionType === VisionType.NONE || thing.visionType === VisionType.OBSERVER) {
                    if (thing.canUpgradeVision?.(VisionType.OBSERVER)) {
                        const price = thing.getVisionUpgradePrice?.(VisionType.OBSERVER) ?? 0;
                        const observerText = this.cachedObserverBtn.querySelector(".inner-text") as HTMLElement;
                        const currentLevel = thing.visionType === VisionType.OBSERVER ? (thing.visionLevel ?? 0) : 0;
                        observerText.innerHTML = `观察塔${currentLevel > 0 ? 'Lv' + (currentLevel + 1) : ''}<br>${price}元`;
                        this.otherItemsEle.appendChild(this.cachedObserverBtn);
                    }
                }
                if (thing.visionType === VisionType.NONE || thing.visionType === VisionType.RADAR) {
                    if (thing.canUpgradeVision?.(VisionType.RADAR)) {
                        const price = thing.getVisionUpgradePrice?.(VisionType.RADAR) ?? 0;
                        const radarText = this.cachedRadarBtn.querySelector(".inner-text") as HTMLElement;
                        const currentLevel = thing.visionType === VisionType.RADAR ? (thing.visionLevel ?? 0) : 0;
                        radarText.innerHTML = `雷达塔${currentLevel > 0 ? 'Lv' + (currentLevel + 1) : ''}<br>${price}元`;
                        this.otherItemsEle.appendChild(this.cachedRadarBtn);
                    }
                }
            }
        });
    }

    showMinePanel(mine: Mine, screenPos: Vector): void {
        if (this.world.territory && !this.world.territory.isPositionInValidTerritory(mine.pos)) {
            const et = new EffectText("不在有效领地，无法操作");
            et.pos = mine.pos.copy();
            this.world.addEffect(et as any);
            this.callbacks.requestPauseRender();
            return;
        }

        this.currentPanelMine = mine;
        this.currentMineScreenPos = screenPos;
        this.currentPanelEntity = null;
        this.currentClickPos = null;

        this.schedulePanelUpdate(() => {
            this.smallLevelUpPanelEle.style.display = "block";
            this.smallLevelUpPanelEle.style.left = screenPos.x + 10 + "px";
            this.smallLevelUpPanelEle.style.top = screenPos.y + 10 + "px";
            const nameSpan = this.smallLevelUpPanelEle.querySelector(".name") as HTMLElement;

            while (this.listEle.firstChild) {
                this.listEle.removeChild(this.listEle.firstChild);
            }
            while (this.otherItemsEle.firstChild) {
                this.otherItemsEle.removeChild(this.otherItemsEle.firstChild);
            }

            if (mine.state === Mine.STATE_NORMAL) {
                nameSpan.innerHTML = "矿井";
                const upgradePrice = mine.getUpgradePrice();
                const upgradeBtn = this.levelUpItemPool[0];
                const nameDiv = upgradeBtn.querySelector(".name") as HTMLElement;
                nameDiv.innerText = "升级为发电厂";
                const iconDiv = upgradeBtn.querySelector(".icon") as HTMLElement;
                iconDiv.style.display = "none";
                const priceDiv = upgradeBtn.querySelector(".price") as HTMLElement;
                priceDiv.innerText = `${upgradePrice}元`;
                upgradeBtn.setAttribute("data-price", upgradePrice!.toString());
                upgradeBtn.setAttribute("data-mine-action", "upgrade");
                this.listEle.appendChild(upgradeBtn);

            } else if (mine.state === Mine.STATE_DAMAGED) {
                nameSpan.innerHTML = "毁坏的矿井";
                if (mine.repairing) {
                    const progressText = document.createElement("p");
                    progressText.innerText = `修复中... ${Math.floor(mine.repairProgress / mine.REPAIR_TIME * 100)}%`;
                    this.listEle.appendChild(progressText);
                } else {
                    const repairBtn = this.levelUpItemPool[0];
                    const nameDiv = repairBtn.querySelector(".name") as HTMLElement;
                    nameDiv.innerText = "修复矿井";
                    const iconDiv = repairBtn.querySelector(".icon") as HTMLElement;
                    iconDiv.style.display = "none";
                    const priceDiv = repairBtn.querySelector(".price") as HTMLElement;
                    priceDiv.innerText = `${mine.REPAIR_COST}元`;
                    repairBtn.setAttribute("data-price", mine.REPAIR_COST.toString());
                    repairBtn.setAttribute("data-mine-action", "repair");
                    this.listEle.appendChild(repairBtn);
                }

            } else if (mine.state === Mine.STATE_POWER_PLANT) {
                nameSpan.innerHTML = `${mine.powerPlantLevel}级发电厂`;

                const upgradePrice = mine.getUpgradePrice();
                if (upgradePrice !== null) {
                    const upgradeBtn = this.levelUpItemPool[0];
                    const nameDiv = upgradeBtn.querySelector(".name") as HTMLElement;
                    nameDiv.innerText = `升级到${mine.powerPlantLevel + 1}级`;
                    const iconDiv = upgradeBtn.querySelector(".icon") as HTMLElement;
                    iconDiv.style.display = "none";
                    const priceDiv = upgradeBtn.querySelector(".price") as HTMLElement;
                    priceDiv.innerText = `${upgradePrice}元`;
                    upgradeBtn.setAttribute("data-price", upgradePrice.toString());
                    upgradeBtn.setAttribute("data-mine-action", "upgrade");
                    this.listEle.appendChild(upgradeBtn);
                } else {
                    const maxLevelText = document.createElement("p");
                    maxLevelText.innerText = "已经是最高等级！";
                    this.listEle.appendChild(maxLevelText);
                }

                const downgradeRefund = mine.getDowngradeRefund();
                const downgradeText = mine.powerPlantLevel > 1
                    ? `降为${mine.powerPlantLevel - 1}级`
                    : "降为矿井";
                const levelDownTextEl = this.cachedLevelDownBtn.querySelector(".inner-text") as HTMLElement;
                levelDownTextEl.innerHTML = `${downgradeText}<br>+${downgradeRefund}元`;
                this.cachedLevelDownBtn.setAttribute("data-refund", downgradeRefund.toString());
                this.otherItemsEle.appendChild(this.cachedLevelDownBtn);

                const sellPrice = mine.getSellPrice();
                const sellTextEl = this.cachedSellBtn.querySelector(".inner-text") as HTMLElement;
                sellTextEl.innerHTML = `卖了<br>+${sellPrice}元`;
                this.cachedSellBtn.setAttribute("data-sell-price", sellPrice.toString());
                this.otherItemsEle.appendChild(this.cachedSellBtn);
            }
        });
    }

    private bindCanvasEvents(): void {
        // Canvas click handler
        this.canvasEle.addEventListener('click', (e) => {
            try {
                const inputHandler = this.canvasEle._inputHandler;
                if (inputHandler?.wasDragging()) {
                    return;
                }
                const rect = this.canvasEle.getBoundingClientRect();
                const screenPos = new Vector(e.clientX - rect.left, e.clientY - rect.top);
                const clickPos = this.world.camera.screenToWorld(screenPos);

                if (this.addedThingFunc === null) {
                    for (const item of this.world.getAllBuildingArr()) {
                        if ((item as any).getBodyCircle().pointIn(clickPos.x, clickPos.y)) {
                            if ((item as any).gameType === "Mine") {
                                this.showMinePanel(item as Mine, screenPos);
                                return;
                            }
                            this.showSmallLevelUpPanel(item as unknown as GameEntity, screenPos);
                            (item as any).selected = true;
                            return;
                        }
                    }
                    for (const mine of this.world.mines) {
                        if ((mine as any).getBodyCircle().pointIn(clickPos.x, clickPos.y)) {
                            this.showMinePanel(mine as Mine, screenPos);
                            return;
                        }
                    }
                    for (const item of this.world.monsters) {
                        if ((item as any).getBodyCircle().pointIn(clickPos.x, clickPos.y)) {
                            this.selectedThing = item as unknown as GameEntity;
                            this.showSelectedPanel(true);
                            (item as any).selected = true;
                            return;
                        }
                    }
                    this.selectedThing = null;
                    this.hideLevelUpPanel();
                } else {
                    const addedThing = this.addedThingFunc(this.world);
                    if (this.world.user.money < addedThing.price) {
                        const et = new EffectText("钱不够了！");
                        et.pos = clickPos.copy();
                        this.world.addEffect(et as any);
                        return;
                    }
                    addedThing.pos = clickPos;
                    for (const item of this.world.getAllBuildingArr()) {
                        if (addedThing.getBodyCircle().impact((item as any).getBodyCircle())) {
                            const et = new EffectText("这里不能放建筑，换一个地方点一下");
                            et.pos = addedThing.pos.copy();
                            this.world.addEffect(et as any);
                            return;
                        }
                    }
                    for (const obs of this.world.obstacles) {
                        if (obs.intersectsCircle(addedThing.getBodyCircle() as any)) {
                            const et = new EffectText("这里有障碍物，不能放置建筑");
                            et.pos = addedThing.pos.copy();
                            this.world.addEffect(et as any);
                            return;
                        }
                    }
                    if (this.world.territory && !this.world.territory.isPositionInValidTerritory(addedThing.pos)) {
                        const et = new EffectText("只能在有效领地内放置建筑");
                        et.pos = addedThing.pos.copy();
                        this.world.addEffect(et as any);
                        return;
                    }
                    this.world.user.money -= addedThing.price;
                    switch (addedThing.gameType) {
                        case "Tower":
                            this.world.addTower(addedThing as any);
                            break;
                        case "Building":
                            this.world.addBuilding(addedThing as any);
                            break;
                    }
                }
            } catch (error) {
                console.error("Canvas click error:", error);
                const et = new EffectText("放置出错！请刷新浏览器重试");
                et.pos = new Vector(this.world.width / 2, this.world.height / 2);
                this.world.addEffect(et as any);
            }
            this.callbacks.requestPauseRender();
        }, { signal: this.eventSignal });

        // Mouse move handler
        this.canvasEle.addEventListener('mousemove', (e) => {
            if (this.addedThingFunc === null) {
                this.cachedBuilding = null;
                this.lastAddedFunc = null;
                return;
            }
            if (this.lastAddedFunc !== this.addedThingFunc) {
                this.cachedBuilding = this.addedThingFunc(this.world);
                this.lastAddedFunc = this.addedThingFunc;
            }
            this.world.user.putLoc.building = this.cachedBuilding as any;

            const rect = this.canvasEle.getBoundingClientRect();
            const screenPos = new Vector(e.clientX - rect.left, e.clientY - rect.top);
            const worldPos = this.world.camera.screenToWorld(screenPos);

            this.world.user.putLoc.x = worldPos.x;
            this.world.user.putLoc.y = worldPos.y;
            this.callbacks.requestPauseRender();
        }, { signal: this.eventSignal });
    }

    private setupRightClickHandler(): void {
        document.oncontextmenu = (e) => {
            if (e.button === 2) {
                this.addedThingFunc = null;
                this.world.user.putLoc.building = null;
                this.cachedBuilding = null;
                this.lastAddedFunc = null;
                this.callbacks.requestPauseRender();
                return false;
            }
            return true;
        };
    }

    private startIntervals(): void {
        // Refresh panel interval
        this.refreshPanelInterval = setInterval(() => {
            if (this.addedThingFunc === null && this.selectedThing === null) {
                this.showInitPanel();
            } else if (this.selectedThing !== null) {
                this.showSelectedPanel(false);
            }
            if (this.callbacks.getGameEnd()) {
                clearInterval(this.refreshPanelInterval!);
            }
        }, 100);

        // Button state update interval
        this.freshBtnInterval = setInterval(() => {
            const towerBtnArr = document.getElementsByClassName("towerBtn");

            const basicC = ((TowerFinallyCompat as any).BasicCannon as (world: unknown) => GameEntity)(this.world);
            towerBtnArr[0]?.setAttribute("data-price", basicC.price.toString());
            if (towerBtnArr[0]) {
                towerBtnArr[0].innerHTML = basicC.name + `<br>${basicC.price}￥`;
            }
            for (let i = 0; i < towerBtnArr.length; i++) {
                const btn = towerBtnArr[i] as HTMLElement;
                if (parseInt(btn.dataset.price!) <= this.world.user.money) {
                    btn.removeAttribute("disabled");
                } else {
                    btn.setAttribute("disabled", "disabled");
                }
            }
            if (this.callbacks.getGameEnd()) {
                clearInterval(this.freshBtnInterval!);
            }
            const cancelSelectBtn = document.getElementById("cancelSelect");
            if (cancelSelectBtn) {
                if (this.addedThingFunc === null) {
                    cancelSelectBtn.setAttribute("disabled", "disabled");
                } else {
                    cancelSelectBtn.removeAttribute("disabled");
                }
            }
            const itemArr = this.smallLevelUpPanelEle.getElementsByClassName("levelUpItem");
            for (let i = 0; i < itemArr.length; i++) {
                const itemEle = itemArr[i] as HTMLElement;
                if (parseInt(itemEle.dataset.price!) <= this.world.user.money) {
                    itemEle.removeAttribute("disabled");
                    itemEle.style.opacity = "1";
                } else {
                    itemEle.setAttribute("disabled", "disabled");
                    itemEle.style.opacity = "0.2";
                }
            }
        }, 100);
    }
}
