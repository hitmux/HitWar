/**
 * Endless mode - main game interface and loop
 */

import { gotoPage } from '../navigation/router';
import { PanelDragManager } from '../panels/panelDrag';
import { World } from '../../game/world';
import { Vector } from '../../core/math/vector';
import { InputHandler } from '../../core/input/inputHandler';
import { EffectText } from '../../effects/effect';
import { TowerFinallyCompat } from '../../towers/index';
import { TOWER_IMG_WIDTH, TOWER_IMG_HEIGHT, TOWER_IMG_PRE_WIDTH, TOWER_IMG_PRE_HEIGHT } from '../../towers/index';
import { TowerRegistry } from '../../towers/towerRegistry';
import { getBuildingFuncArr } from '../../buildings/index';
import { Mine } from '../../systems/energy/mine';
import { SoundManager } from '../../systems/sound/soundManager';
import { Sounds } from '../../systems/sound/sounds';
import { SaveManager } from '../../systems/save/saveManager';
import { SaveUI } from '../../systems/save/saveUI';
import { VisionType, VISION_CONFIG } from '../../systems/fog/visionConfig';

// Building functions array
const BUILDING_FUNC_ARR = getBuildingFuncArr();

/**
 * Calculate image sprite position from index (static helper to avoid creating Tower instances)
 */
function getTowerImgPosition(imgIndex: number): { x: number; y: number } {
    const cols = Math.floor(TOWER_IMG_WIDTH / TOWER_IMG_PRE_WIDTH);
    const x = (imgIndex % cols) * TOWER_IMG_PRE_WIDTH;
    const y = Math.floor(imgIndex / cols) * TOWER_IMG_PRE_HEIGHT;
    return { x, y };
}

// Type definitions
interface GameEntity {
    pos: Vector;
    name: string;
    price: number;
    gameType: string;
    r?: number;
    rangeR?: number;
    selected?: boolean;
    levelUpArr: unknown[];
    levelDownGetter: unknown;
    towerLevel: number;
    imgIndex: number;
    inValidTerritory: boolean;
    comment?: string;
    getBodyCircle: () => { pointIn: (x: number, y: number) => boolean; impact: (other: unknown) => boolean };
    getImgStartPosByIndex: (index: number) => { x: number; y: number };
    remove: () => void;
    // Vision system methods
    getSellRefund?: () => number;
    visionType?: VisionType;
    visionLevel?: number;
    radarAngle?: number;
    canUpgradeVision?: (type: VisionType) => boolean;
    upgradeVision?: (type: VisionType) => boolean;
    getVisionUpgradePrice?: (type: VisionType) => number;
}

interface CanvasWithInputHandler extends HTMLCanvasElement {
    _inputHandler?: InputHandler;
    _eventAbortController?: AbortController;
}

/**
 * Start endless mode
 * @param mode - Game mode: "easy", "normal", "hard"
 * @param haveGroup - Whether to have monster waves, false for infinite time mode
 * @param loadedSaveData - If has save data, load it directly
 */
export function endlessMode(mode: string, haveGroup: boolean = true, loadedSaveData: unknown = null): void {
    /**
     * Current interface
     */
    let thisInterface = document.querySelector(".war-interface") as HTMLElement;
    /**
     * Canvas element
     */
    let canvasEle = document.querySelector("#mainCanvas") as CanvasWithInputHandler;
    /**
     * Right side choice buttons
     */
    let choiceBtn = document.querySelector(".choiceBtn") as HTMLElement;
    choiceBtn.style.display = "block";
    /**
     * Game pause button
     */
    let pauseBtn = document.querySelector(".pause") as HTMLElement;
    let isGamePause = false;
    let requestRenderOnPause: (() => void) | null = null;
    let resetLoopAccumulator: (() => void) | null = null;
    pauseBtn.addEventListener("click", () => {
        isGamePause = !isGamePause;
        if (isGamePause) {
            pauseBtn.innerHTML = "开始";
            SoundManager.pauseAll();
            if (requestRenderOnPause) {
                requestRenderOnPause();
            }
        } else {
            pauseBtn.innerHTML = "暂停";
            SoundManager.resumeAll();
            if (resetLoopAccumulator) {
                resetLoopAccumulator();
            }
        }
    });

    /**
     * Speed control buttons
     */
    let speedBtns = document.querySelectorAll(".speedBtn") as NodeListOf<HTMLElement>;
    speedBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            speedBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            world.gameSpeed = parseInt(btn.dataset.speed!);
        });
    });

    /**
     * Initialize panel drag and resize functionality
     */
    new PanelDragManager('speedControlPanel', '.dragHandle', 'speedControlPanelState');

    let cheatModeEnabled = false;
    let pausedBeforeCheat = false;
    let toggleCheatBtn = document.getElementById("toggleCheatBtn") as HTMLButtonElement;
    let cheatMenu = document.getElementById("cheatMenu") as HTMLElement;
    let cheatConfirmDialog = document.getElementById("cheatConfirmDialog") as HTMLElement;
    let cheatModeIndicator = document.getElementById("cheatModeIndicator") as HTMLElement;
    let confirmCheatBtn = document.getElementById("confirmCheat") as HTMLElement;
    let cancelCheatBtn = document.getElementById("cancelCheat") as HTMLElement;

    // Reset cheat mode UI state when starting a new game
    cheatMenu.style.display = "none";
    cheatConfirmDialog.style.display = "none";
    cheatModeIndicator.style.display = "none";
    toggleCheatBtn.classList.remove("active");
    toggleCheatBtn.textContent = "作弊模式";
    toggleCheatBtn.disabled = false;

    // Toggle cheat mode button
    toggleCheatBtn.addEventListener("click", () => {
        if (!cheatModeEnabled) {
            cheatConfirmDialog.style.display = "flex";
            pausedBeforeCheat = isGamePause;
            if (!isGamePause) {
                pauseBtn.click();
            }
        }
    });

    // Confirm cheat mode activation
    confirmCheatBtn.addEventListener("click", () => {
        cheatModeEnabled = true;
        world.cheatMode.enabled = true;
        cheatConfirmDialog.style.display = "none";
        cheatMenu.style.display = "block";
        toggleCheatBtn.classList.add("active");
        toggleCheatBtn.textContent = "作弊模式已开启";
        toggleCheatBtn.disabled = true;
        cheatModeIndicator.style.display = "block";
        if (!pausedBeforeCheat && isGamePause) {
            pauseBtn.click();
        }
    });

    // Cancel cheat mode activation
    cancelCheatBtn.addEventListener("click", () => {
        cheatConfirmDialog.style.display = "none";
        if (!pausedBeforeCheat && isGamePause) {
            pauseBtn.click();
        }
    });

    // Money cheat buttons
    let moneyBtns = document.querySelectorAll('.cheatBtn[data-action="money"]') as NodeListOf<HTMLElement>;
    moneyBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            let amount = parseInt(btn.dataset.value!);
            world.user.money += amount;
        });
    });

    // Custom money button
    let customMoneyBtn = document.getElementById("customMoneyBtn") as HTMLElement;
    let customMoneyDialog = document.getElementById("customMoneyDialog") as HTMLElement;
    let customMoneyInput = document.getElementById("customMoneyInput") as HTMLInputElement;
    let confirmCustomMoney = document.getElementById("confirmCustomMoney") as HTMLElement;
    let cancelCustomMoney = document.getElementById("cancelCustomMoney") as HTMLElement;

    customMoneyBtn.addEventListener("click", () => {
        customMoneyDialog.style.display = "flex";
        customMoneyInput.value = "";
        customMoneyInput.focus();
    });

    confirmCustomMoney.addEventListener("click", () => {
        let amount = parseInt(customMoneyInput.value);
        if (amount && amount > 0) {
            world.user.money += amount;
        }
        customMoneyDialog.style.display = "none";
    });

    cancelCustomMoney.addEventListener("click", () => {
        customMoneyDialog.style.display = "none";
    });

    // Price multiplier buttons
    let priceMultBtns = document.querySelectorAll('.priceMultBtn') as NodeListOf<HTMLElement>;
    priceMultBtns.forEach(btn => {
        if (parseFloat(btn.dataset.mult!) === 1.0) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    priceMultBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            priceMultBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            let mult = parseFloat(btn.dataset.mult!);
            world.cheatMode.priceMultiplier = mult;
        });
    });

    // Infinite HP checkbox
    let infiniteHpCheckbox = document.getElementById("infiniteHpCheckbox") as HTMLInputElement;
    infiniteHpCheckbox.checked = false;
    infiniteHpCheckbox.addEventListener("change", () => {
        world.cheatMode.infiniteHp = infiniteHpCheckbox.checked;
    });

    // Disable Energy checkbox
    let disableEnergyCheckbox = document.getElementById("disableEnergyCheckbox") as HTMLInputElement;
    disableEnergyCheckbox.checked = false;
    disableEnergyCheckbox.addEventListener("change", () => {
        world.cheatMode.disableEnergy = disableEnergyCheckbox.checked;
    });

    // Fog toggle button
    let toggleFogBtn = document.getElementById("toggleFogBtn") as HTMLButtonElement;
    toggleFogBtn.textContent = "隐藏迷雾";
    toggleFogBtn.addEventListener("click", () => {
        world.fog.enabled = !world.fog.enabled;
        toggleFogBtn.textContent = world.fog.enabled ? "隐藏迷雾" : "显示迷雾";
        world.fog.renderer.invalidateCache();
    });

    let gameEnd = false;
    /**
     * Back button click event
     */
    thisInterface.querySelector(".backPage")!.addEventListener("click", () => {
        gameEnd = true;
        choiceBtn.style.display = "none";
        Sounds.switchBgm("main");
        gotoPage("modeChoice-interface");
    });

    // Switch background music
    Sounds.switchBgm("war");

    // World size is 3x canvas size
    let viewWidth = canvasEle.width;
    let viewHeight = canvasEle.height;
    let worldWidth = viewWidth * 3;
    let worldHeight = viewHeight * 3;
    let world = new World(worldWidth, worldHeight, viewWidth, viewHeight);
    world.resizeCanvas(canvasEle);

    world.mode = mode;
    if (!haveGroup) {
        world.haveFlow = false;
        if (mode === "hard") {
            world.user.money = 1000;
        }
    }

    // Handle save data loading
    let startGame = () => {
        startGameLoop();
    };

    // If loaded from file import, apply save data directly
    if (loadedSaveData) {
        SaveManager.deserialize(loadedSaveData as any, world as any, null);
        startGame();
        return;
    }

    // Check for existing save in localStorage
    if (SaveManager.hasSave(mode, haveGroup)) {
        let saveData = SaveManager.loadFromLocal(mode, haveGroup);
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

    function startGameLoop() {
    /**
     * Start game loop
     */

    // Pause render flag
    let pauseNeedsRender = false;

    // Request pause render helper
    function requestPauseRender() {
        if (isGamePause) {
            pauseNeedsRender = true;
        }
    }
    requestRenderOnPause = () => {
        pauseNeedsRender = true;
        world.markUiDirty();
    };

    // Generate unique session ID
    let sessionId = Date.now().toString() + Math.random().toString(36).slice(2);

    // Clean up old InputHandler
    if (canvasEle._inputHandler) {
        canvasEle._inputHandler.destroy();
    }
    // Create input handler
    let inputHandler = new InputHandler(world.camera, canvasEle);
    canvasEle._inputHandler = inputHandler;
    inputHandler.onRenderRequest = requestPauseRender;

    // Use AbortController to manage canvas event listeners
    if (canvasEle._eventAbortController) {
        canvasEle._eventAbortController.abort();
    }
    canvasEle._eventAbortController = new AbortController();
    let eventSignal = canvasEle._eventAbortController.signal;

    // Bind zoom buttons and home button
    let zoomInBtn = document.getElementById("zoomInBtn");
    let zoomOutBtn = document.getElementById("zoomOutBtn");
    let homeBtn = document.getElementById("homeBtn");
    let zoomLevelSpan = document.getElementById("zoomLevel");

    if (zoomInBtn) {
        zoomInBtn.addEventListener("click", () => {
            inputHandler.zoomIn();
        });
    }
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener("click", () => {
            inputHandler.zoomOut();
        });
    }
    if (homeBtn) {
        homeBtn.addEventListener("click", () => {
            world.camera.centerOn(world.rootBuilding.pos);
            requestPauseRender();
        });
    }

    // ========== Keyboard Controls ==========
    let speedBoostIndicator = document.getElementById("speedBoostIndicator") as HTMLElement;
    let isSpaceHeld = false;
    let spaceHoldTimer: ReturnType<typeof setTimeout> | null = null;
    let originalSpeed: number | null = null;
    const HOLD_THRESHOLD = 200;
    const BOOST_SPEED = 3;

    function togglePause() {
        pauseBtn.click();
    }

    function startSpeedBoost() {
        if (isGamePause) return;
        isSpaceHeld = true;
        originalSpeed = world.gameSpeed;
        world.gameSpeed = originalSpeed * BOOST_SPEED;
        speedBoostIndicator.querySelector(".speedBoostText")!.textContent = `x${world.gameSpeed} 加速中`;
        speedBoostIndicator.style.display = "block";
    }

    function stopSpeedBoost() {
        if (originalSpeed !== null) {
            world.gameSpeed = originalSpeed;
            originalSpeed = null;
        }
        isSpaceHeld = false;
        speedBoostIndicator.style.display = "none";
    }

    function handleKeyDown(e: KeyboardEvent) {
        if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
        if (e.code === "Space") {
            e.preventDefault();
            if (e.repeat) return;
            spaceHoldTimer = setTimeout(() => {
                startSpeedBoost();
            }, HOLD_THRESHOLD);
        }
    }

    function handleKeyUp(e: KeyboardEvent) {
        if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
        if (e.code === "Space") {
            e.preventDefault();
            if (spaceHoldTimer) {
                clearTimeout(spaceHoldTimer);
                spaceHoldTimer = null;
            }
            if (isSpaceHeld) {
                stopSpeedBoost();
            } else {
                togglePause();
            }
        }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    let cleanupKeyboardListeners = () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("keyup", handleKeyUp);
        if (spaceHoldTimer) {
            clearTimeout(spaceHoldTimer);
        }
        stopSpeedBoost();
    };

    // Add export button
    let rightTopArea = thisInterface.querySelector(".rightTopArea") as HTMLElement;
    if (!rightTopArea.querySelector(".exportSaveBtn")) {
        SaveUI.addExportButton(rightTopArea, () => world as any);
    }

    // Restore cheat mode UI state
    if (world.cheatMode.enabled) {
        cheatModeEnabled = true;
        cheatMenu.style.display = "block";
        toggleCheatBtn.classList.add("active");
        toggleCheatBtn.textContent = "作弊模式已开启";
        toggleCheatBtn.disabled = true;
        cheatModeIndicator.style.display = "block";

        priceMultBtns.forEach(btn => {
            btn.classList.remove("active");
            if (parseFloat(btn.dataset.mult!) === world.cheatMode.priceMultiplier) {
                btn.classList.add("active");
            }
        });
        infiniteHpCheckbox.checked = world.cheatMode.infiniteHp;
        disableEnergyCheckbox.checked = world.cheatMode.disableEnergy;
    }

    // Restore speed button UI state
    speedBtns.forEach(btn => {
        btn.classList.remove("active");
        if (parseInt(btn.dataset.speed!) === world.gameSpeed) {
            btn.classList.add("active");
        }
    });

    // Auto save timer
    let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
    let hasShownAutoSaveIndicator = false;

    function startAutoSaveTimer() {
        if (autoSaveTimer) {
            clearInterval(autoSaveTimer);
        }
        autoSaveTimer = setInterval(() => {
            if (!isGamePause && !gameEnd) {
                let saveData = SaveManager.serialize(world as any);
                SaveManager.saveToLocal(mode, haveGroup, saveData);
                if (!hasShownAutoSaveIndicator) {
                    SaveUI.showAutoSaveIndicator();
                    hasShownAutoSaveIndicator = true;
                }
            }
        }, 6000);
    }

    startAutoSaveTimer();

    const BASE_STEP_MS = 25;
    let accumulator = 0;
    let lastFrameTime = performance.now();
    let rafId: number | null = null;

    // Loop guard: 主循环防堆积策略
    const LOOP_GUARD = {
        consecutiveOverload: 0,       // 连续触顶次数
        overloadThreshold: 30,        // 触发降级的连续触顶帧数阈值
        recoveryThreshold: 60,        // 触发恢复的连续正常帧数阈值
        consecutiveNormal: 0,         // 连续正常帧数
        degradationLevel: 0,          // 当前降级等级 (0=正常, 1=轻度, 2=重度)
        maxDegradation: 2,            // 最大降级等级
        lastWarningTime: 0,           // 上次警告时间
        warningCooldown: 5000,        // 警告冷却时间(ms)
    };

    // 降级参数表: [maxStepsMultiplier, stepMultiplier]
    const DEGRADATION_PARAMS: [number, number][] = [
        [1, 1],       // 等级0: 正常
        [0.75, 1.2],  // 等级1: maxSteps降至75%, step提高20%
        [0.5, 1.5],   // 等级2: maxSteps降至50%, step提高50%
    ];

    const updateZoomLevel = () => {
        if (zoomLevelSpan) {
            zoomLevelSpan.textContent = Math.round(world.camera.zoom * 100) + "%";
        }
    };

    // 性能降级警告提示
    const showPerformanceWarning = (level: number) => {
        const now = performance.now();
        if (now - LOOP_GUARD.lastWarningTime < LOOP_GUARD.warningCooldown) return;
        LOOP_GUARD.lastWarningTime = now;

        const messages = [
            "",
            "⚠️ 性能警告: 已启用轻度降级模式",
            "⚠️ 性能警告: 已启用重度降级模式"
        ];
        if (level > 0) {
            console.warn(`[LoopGuard] ${messages[level]}, consecutiveOverload=${LOOP_GUARD.consecutiveOverload}`);
        }
    };

    resetLoopAccumulator = () => {
        accumulator = 0;
        lastFrameTime = performance.now();
        // 重置时也重置降级状态
        LOOP_GUARD.consecutiveOverload = 0;
        LOOP_GUARD.consecutiveNormal = 0;
    };

    const mainLoop = (now: number) => {
        if (gameEnd) {
            cleanupKeyboardListeners();
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
            if (autoSaveTimer) {
                clearInterval(autoSaveTimer);
            }
            return;
        }

        const delta = Math.min(now - lastFrameTime, 200);
        lastFrameTime = now;

        if (!isGamePause) {
            // 获取当前降级参数
            const [maxStepsMult, stepMult] = DEGRADATION_PARAMS[LOOP_GUARD.degradationLevel];
            const step = (BASE_STEP_MS / Math.max(1, world.gameSpeed)) * stepMult;
            accumulator += delta;
            let steps = 0;
            const baseMaxSteps = 8 * Math.max(1, world.gameSpeed);
            const maxSteps = Math.max(2, Math.floor(baseMaxSteps * maxStepsMult));

            while (accumulator >= step && steps < maxSteps) {
                world.goTick();
                accumulator -= step;
                steps++;
            }

            // Loop guard 状态更新
            if (steps === maxSteps) {
                // 触顶: 清空积累，增加触顶计数
                accumulator = 0;
                LOOP_GUARD.consecutiveOverload++;
                LOOP_GUARD.consecutiveNormal = 0;

                // 检查是否需要升级降级等级
                if (LOOP_GUARD.consecutiveOverload >= LOOP_GUARD.overloadThreshold &&
                    LOOP_GUARD.degradationLevel < LOOP_GUARD.maxDegradation) {
                    LOOP_GUARD.degradationLevel++;
                    LOOP_GUARD.consecutiveOverload = 0;
                    showPerformanceWarning(LOOP_GUARD.degradationLevel);
                }
            } else {
                // 正常: 增加正常计数
                LOOP_GUARD.consecutiveNormal++;
                LOOP_GUARD.consecutiveOverload = 0;

                // 检查是否可以恢复降级等级
                if (LOOP_GUARD.consecutiveNormal >= LOOP_GUARD.recoveryThreshold &&
                    LOOP_GUARD.degradationLevel > 0) {
                    LOOP_GUARD.degradationLevel--;
                    LOOP_GUARD.consecutiveNormal = 0;
                    if (LOOP_GUARD.degradationLevel === 0) {
                        console.log("[LoopGuard] 性能已恢复正常");
                    }
                }
            }

            world.render(canvasEle);
            updateZoomLevel();
        } else if (pauseNeedsRender) {
            world.render(canvasEle);
            updateZoomLevel();
            pauseNeedsRender = false;
            accumulator = 0;
            lastFrameTime = now;
        }

        if ((world.rootBuilding as any).isDead()) {
            SaveManager.clearSave(mode, haveGroup);
            alert("你失败了");
            location.reload();
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
            if (autoSaveTimer) {
                clearInterval(autoSaveTimer);
            }
            return;
        }

        rafId = requestAnimationFrame(mainLoop);
    };

    rafId = requestAnimationFrame((now) => {
        lastFrameTime = now;
        mainLoop(now);
    });

    let addedThingFunc: ((world: unknown) => GameEntity) | null = null;
    let selectedThing: GameEntity | null = null;
    let btnClassName = "towerBtn";
    let initBtnListClassName = "initPanel";
    let selectedListClassName = "choicePanel";
    let smallLevelUpPanelEle = document.querySelector("#smallLevelUpPanel") as HTMLElement;

    // ========== DOM Cache for Level Up Panel (Performance Optimization) ==========
    const LEVELUP_POOL_SIZE = 10;
    const levelUpItemPool: HTMLElement[] = [];
    let cachedLevelDownBtn: HTMLElement;
    let cachedSellBtn: HTMLElement;
    let cachedObserverBtn: HTMLElement;
    let cachedRadarBtn: HTMLElement;
    let currentPanelEntity: GameEntity | null = null;
    let currentClickPos: Vector | null = null;
    let currentPanelMine: Mine | null = null;
    let currentMineScreenPos: Vector | null = null;
    const listEle = smallLevelUpPanelEle.querySelector(".levelUpItems") as HTMLElement;
    const otherItemsEle = smallLevelUpPanelEle.querySelector(".otherItems") as HTMLElement;
    const rate = 0.5;

    // RAF scheduling for panel updates
    let pendingPanelRAF: number | null = null;
    let pendingPanelUpdate: (() => void) | null = null;

    /**
     * Schedule panel update using requestAnimationFrame (deferred rendering)
     */
    function schedulePanelUpdate(updateFn: () => void): void {
        pendingPanelUpdate = updateFn;
        if (pendingPanelRAF === null) {
            pendingPanelRAF = requestAnimationFrame(() => {
                pendingPanelRAF = null;
                if (pendingPanelUpdate) {
                    pendingPanelUpdate();
                    pendingPanelUpdate = null;
                }
            });
        }
    }

    // Create level up item DOM element
    function createLevelUpItem(): HTMLElement {
        let divLevelUpItemEle = document.createElement("div");
        divLevelUpItemEle.classList.add("levelUpItem");
        let nameDiv = document.createElement("div");
        nameDiv.classList.add("name");
        divLevelUpItemEle.appendChild(nameDiv);
        let imgDiv = document.createElement("div");
        imgDiv.classList.add("icon");
        imgDiv.style.backgroundImage = "url('/towers/imgs/towers.png')";
        imgDiv.style.backgroundSize = `${TOWER_IMG_WIDTH * rate}px ${TOWER_IMG_HEIGHT * rate}px`;
        imgDiv.style.width = TOWER_IMG_PRE_WIDTH * rate + "px";
        imgDiv.style.height = TOWER_IMG_PRE_HEIGHT * rate + "px";
        imgDiv.style.outline = "solid 1px";
        divLevelUpItemEle.appendChild(imgDiv);
        let priceDiv = document.createElement("div");
        priceDiv.classList.add("price");
        divLevelUpItemEle.appendChild(priceDiv);
        return divLevelUpItemEle;
    }

    // Initialize DOM pool
    function initPanelDOMCache() {
        // Create level up item pool
        for (let i = 0; i < LEVELUP_POOL_SIZE; i++) {
            levelUpItemPool.push(createLevelUpItem());
        }
        // Create level down button
        cachedLevelDownBtn = document.createElement("div");
        cachedLevelDownBtn.classList.add("item", "levelDown");
        let iconDiv = document.createElement("div");
        iconDiv.classList.add("icon");
        cachedLevelDownBtn.appendChild(iconDiv);
        let textDiv = document.createElement("div");
        textDiv.classList.add("inner-text");
        cachedLevelDownBtn.appendChild(textDiv);

        // Create sell button
        cachedSellBtn = document.createElement("div");
        cachedSellBtn.classList.add("item", "sell");
        let imgDiv = document.createElement("div");
        imgDiv.classList.add("icon");
        cachedSellBtn.appendChild(imgDiv);
        let sellTextDiv = document.createElement("div");
        sellTextDiv.classList.add("inner-text");
        cachedSellBtn.appendChild(sellTextDiv);

        // Create observer vision upgrade button
        cachedObserverBtn = document.createElement("div");
        cachedObserverBtn.classList.add("item", "visionUpgrade", "observer");
        cachedObserverBtn.setAttribute("data-vision-type", VisionType.OBSERVER.toString());
        let observerIconDiv = document.createElement("div");
        observerIconDiv.classList.add("icon");
        observerIconDiv.textContent = "👁";
        cachedObserverBtn.appendChild(observerIconDiv);
        let observerTextDiv = document.createElement("div");
        observerTextDiv.classList.add("inner-text");
        cachedObserverBtn.appendChild(observerTextDiv);

        // Create radar vision upgrade button
        cachedRadarBtn = document.createElement("div");
        cachedRadarBtn.classList.add("item", "visionUpgrade", "radar");
        cachedRadarBtn.setAttribute("data-vision-type", VisionType.RADAR.toString());
        let radarIconDiv = document.createElement("div");
        radarIconDiv.classList.add("icon");
        radarIconDiv.textContent = "📡";
        cachedRadarBtn.appendChild(radarIconDiv);
        let radarTextDiv = document.createElement("div");
        radarTextDiv.classList.add("inner-text");
        cachedRadarBtn.appendChild(radarTextDiv);

        // Setup event delegation for listEle (handles both tower and mine)
        listEle.addEventListener("click", (e) => {
            const target = (e.target as HTMLElement).closest(".levelUpItem") as HTMLElement | null;
            if (!target) return;

            // Handle tower upgrade
            if (currentPanelEntity && currentClickPos) {
                const price = parseInt(target.dataset.price!);
                const towerName = target.dataset.towerName!;
                if (world.user.money >= price) {
                    let pos = currentPanelEntity.pos.copy();
                    world.user.money -= currentPanelEntity.price;
                    let newThing = TowerRegistry.create(towerName, world) as GameEntity;
                    newThing.towerLevel = currentPanelEntity.towerLevel + 1;
                    newThing.pos = pos;
                    // Preserve vision attributes on upgrade
                    newThing.visionType = currentPanelEntity.visionType;
                    newThing.visionLevel = currentPanelEntity.visionLevel;
                    newThing.radarAngle = currentPanelEntity.radarAngle;
                    world.addTower(newThing as any);
                    currentPanelEntity.remove();
                    showSmallLevelUpPanel(newThing, currentClickPos);
                } else {
                    let et = new EffectText("钱不够！");
                    et.pos = currentClickPos;
                    world.addEffect(et as any);
                }
                requestPauseRender();
                return;
            }

            // Handle mine operations
            if (currentPanelMine && currentMineScreenPos) {
                const action = target.dataset.mineAction;
                const price = parseInt(target.dataset.price || "0");
                if (action === "upgrade" || action === "repair") {
                    if (world.user.money >= price) {
                        world.user.money -= price;
                        if (action === "upgrade") {
                            currentPanelMine.upgrade();
                        } else {
                            currentPanelMine.startRepair();
                        }
                        showMinePanel(currentPanelMine, currentMineScreenPos);
                    } else {
                        let et = new EffectText("钱不够！");
                        et.pos = currentPanelMine.pos.copy();
                        world.addEffect(et as any);
                    }
                }
                requestPauseRender();
            }
        });

        // Setup event delegation for otherItemsEle (handles both tower and mine)
        otherItemsEle.addEventListener("click", (e) => {
            const target = (e.target as HTMLElement).closest(".item") as HTMLElement | null;
            if (!target) return;

            // Handle tower operations
            if (currentPanelEntity && currentClickPos) {
                if (target.classList.contains("levelDown")) {
                    let towerName = currentPanelEntity.levelDownGetter as string | null;
                    if (towerName === null) {
                        let et = new EffectText("无法降级！");
                        et.pos = currentClickPos;
                        world.addEffect(et as any);
                    } else {
                        let downObj = TowerRegistry.create(towerName, world) as GameEntity;
                        downObj.towerLevel = Math.max(1, currentPanelEntity.towerLevel - 1);
                        // Preserve vision attributes on downgrade
                        downObj.visionType = currentPanelEntity.visionType;
                        downObj.visionLevel = currentPanelEntity.visionLevel;
                        downObj.radarAngle = currentPanelEntity.radarAngle;
                        world.user.money += currentPanelEntity.price / 4;
                        let newPos = currentPanelEntity.pos.copy();
                        currentPanelEntity.remove();
                        downObj.pos = newPos;
                        world.addTower(downObj as any);
                        showSmallLevelUpPanel(downObj, currentClickPos);
                    }
                } else if (target.classList.contains("sell")) {
                    // Use getSellRefund() for total refund (includes vision upgrade costs)
                    const refund = currentPanelEntity.getSellRefund?.() ?? Math.floor(currentPanelEntity.price / 2);
                    world.user.money += refund;
                    currentPanelEntity.remove();
                    hideSmallLevelUpPanelEle();
                } else if (target.classList.contains("visionUpgrade")) {
                    // Handle vision upgrade
                    const visionType = (target.dataset.visionType || VisionType.NONE) as VisionType;
                    if (currentPanelEntity.canUpgradeVision?.(visionType)) {
                        const price = currentPanelEntity.getVisionUpgradePrice?.(visionType) ?? 0;
                        if (world.user.money >= price) {
                            currentPanelEntity.upgradeVision?.(visionType);
                            world.user.money -= price;
                            world.fog.markDirty();
                            showSmallLevelUpPanel(currentPanelEntity, currentClickPos);
                        } else {
                            let et = new EffectText("金币不足！");
                            et.pos = currentPanelEntity.pos.copy();
                            world.addEffect(et as any);
                        }
                    }
                }
                requestPauseRender();
                return;
            }

            // Handle mine operations
            if (currentPanelMine && currentMineScreenPos) {
                if (target.classList.contains("levelDown")) {
                    const refund = parseInt(target.dataset.refund || "0");
                    world.user.money += refund;
                    currentPanelMine.downgrade();
                    showMinePanel(currentPanelMine, currentMineScreenPos);
                } else if (target.classList.contains("sell")) {
                    const sellPrice = parseInt(target.dataset.sellPrice || "0");
                    world.user.money += sellPrice;
                    currentPanelMine.destroy();
                    hideSmallLevelUpPanelEle();
                }
                requestPauseRender();
            }
        });
    }
    initPanelDOMCache();
    // ========== End DOM Cache ==========

    /**
     * Show init panel
     */
    function showInitPanel() {
        let panelEle = document.querySelector(`.${initBtnListClassName}`) as HTMLElement & { dataset: { sessionId?: string } };

        if (panelEle.dataset.sessionId !== sessionId) {
            panelEle.innerHTML = "";
            panelEle.dataset.sessionId = sessionId;
            let thingsFuncArr: ((world: unknown) => GameEntity)[] = [];
            thingsFuncArr.push((TowerFinallyCompat as any).BasicCannon as (world: unknown) => GameEntity);
            for (let bF of BUILDING_FUNC_ARR) {
                thingsFuncArr.push(bF as (world: unknown) => GameEntity);
            }
            for (let bFunc of thingsFuncArr) {
                let btn = document.createElement('button');
                btn.classList.add(btnClassName);
                let b = bFunc(world);
                btn.innerHTML = b.name + `<br>${b.price}￥`;
                btn.classList.add(b.gameType);
                btn.setAttribute("data-price", b.price.toString());
                btn.addEventListener("click", () => {
                    addedThingFunc = bFunc;
                });
                panelEle.appendChild(btn);
            }
            let cancelBtn = document.createElement("button");
            cancelBtn.innerText = "取消放置模式";
            cancelBtn.id = "cancelSelect";
            cancelBtn.addEventListener("click", () => {
                addedThingFunc = null;
                world.user.putLoc.building = null;
                cachedBuilding = null;
                lastAddedFunc = null;
                requestPauseRender();
            });
            panelEle.appendChild(cancelBtn);
        }

        if (panelEle.style.display === "block") {
            return;
        }
        hideAllPanel();
        panelEle.style.display = "block";
    }

    /**
     * Refresh right side panel
     */
    let refreshPanel = setInterval(() => {
        if (addedThingFunc === null && selectedThing === null) {
            showInitPanel();
        } else if (selectedThing !== null) {
            showSelectedPanel(false);
        }
        if (gameEnd) {
            clearInterval(refreshPanel);
        }
    }, 100);

    /**
     * Right click behavior
     */
    document.oncontextmenu = function (e) {
        if (e.button === 2) {
            addedThingFunc = null;
            world.user.putLoc.building = null;
            cachedBuilding = null;
            lastAddedFunc = null;
            requestPauseRender();
            return false;
        }
        return true;
    };

    /**
     * Show selected panel
     */
    function showSelectedPanel(forceAble: boolean) {
        let panelEle = document.querySelector(`.${selectedListClassName}`) as HTMLElement;
        if (panelEle.style.display === "block") {
            if (!forceAble) {
                return;
            }
        }
        hideAllPanel();
        panelEle.style.display = "block";
        if (panelEle.innerHTML === "") {
        } else {
            let hideAllData = () => {
                for (let i = 0; i < panelEle.children.length; i++) {
                    (panelEle.children[i] as HTMLElement).style.display = "none";
                }
            };
            if (selectedThing!.gameType === "Monster") {
                hideAllData();
                (panelEle.querySelector(".monsterData") as HTMLElement).style.display = "block";
                (panelEle.querySelector(".monsterName") as HTMLElement).innerHTML = selectedThing!.name;
                (panelEle.querySelector(".monsterComment") as HTMLElement).innerHTML = selectedThing!.comment || "";
            }
        }
    }

    /**
     * Hide all panels
     */
    function hideAllPanel() {
        for (let i = 0; i < choiceBtn.children.length; i++) {
            (choiceBtn.children[i] as HTMLElement).style.display = "none";
        }
    }

    /**
     * Level up panel mouse leave event
     */
    smallLevelUpPanelEle.addEventListener("mouseleave", () => {
        hideSmallLevelUpPanelEle();
    });

    /**
     * Hide small level up panel
     */
    function hideSmallLevelUpPanelEle() {
        smallLevelUpPanelEle.style.display = "none";
    }

    /**
     * Show small level up panel (optimized with DOM caching + RAF)
     */
    function showSmallLevelUpPanel(thing: GameEntity, clickPos: Vector) {
        if (thing.inValidTerritory === false) {
            let et = new EffectText("无效领地内无法操作！");
            et.pos = thing.pos.copy();
            world.addEffect(et as any);
            requestPauseRender();
            return;
        }
        // Update current state for event delegation (immediate, needed for click handlers)
        currentPanelEntity = thing;
        currentClickPos = clickPos;
        currentPanelMine = null;
        currentMineScreenPos = null;

        // Schedule DOM updates via requestAnimationFrame
        schedulePanelUpdate(() => {
            smallLevelUpPanelEle.style.display = "block";
            smallLevelUpPanelEle.style.left = clickPos.x + 10 + "px";
            smallLevelUpPanelEle.style.top = clickPos.y + 10 + "px";
            let nameSpan = smallLevelUpPanelEle.querySelector(".name") as HTMLElement;
            nameSpan.innerHTML = thing.name;

            // Clear and rebuild using pool (much faster than innerHTML = "")
            while (listEle.firstChild) {
                listEle.removeChild(listEle.firstChild);
            }

            if (thing.levelUpArr.length === 0) {
                let tips = document.createElement("p");
                tips.innerText = '这个建筑已经顶级啦！';
                listEle.appendChild(tips);
            } else {
                // Use cached DOM elements
                let index = 0;
                for (let towerName of thing.levelUpArr as string[]) {
                    const meta = TowerRegistry.getMeta(towerName);
                    if (!meta) continue;

                    // Get or create item from pool
                    let itemEle: HTMLElement;
                    if (index < levelUpItemPool.length) {
                        itemEle = levelUpItemPool[index];
                    } else {
                        itemEle = createLevelUpItem();
                        levelUpItemPool.push(itemEle);
                    }

                    // Update item content
                    const nameDiv = itemEle.querySelector(".name") as HTMLElement;
                    nameDiv.innerText = meta.name;
                    const imgDiv = itemEle.querySelector(".icon") as HTMLElement;
                    imgDiv.style.display = "";
                    let diffPos = getTowerImgPosition(meta.imgIndex);
                    imgDiv.style.backgroundPositionX = -diffPos.x * rate + "px";
                    imgDiv.style.backgroundPositionY = -diffPos.y * rate + "px";
                    const priceDiv = itemEle.querySelector(".price") as HTMLElement;
                    priceDiv.innerText = `${meta.basePrice}元`;

                    itemEle.setAttribute("data-price", meta.basePrice.toString());
                    itemEle.setAttribute("data-tower-name", towerName);

                    listEle.appendChild(itemEle);
                    index++;
                }
            }

            // Update and append cached level down button
            while (otherItemsEle.firstChild) {
                otherItemsEle.removeChild(otherItemsEle.firstChild);
            }
            const levelDownText = cachedLevelDownBtn.querySelector(".inner-text") as HTMLElement;
            levelDownText.innerHTML = `降级<br>+${thing.price / 4}元`;
            otherItemsEle.appendChild(cachedLevelDownBtn);

            // Update and append cached sell button
            const sellText = cachedSellBtn.querySelector(".inner-text") as HTMLElement;
            const sellRefund = thing.getSellRefund?.() ?? Math.floor(thing.price / 2);
            sellText.innerHTML = `卖了<br>+${sellRefund}元`;
            otherItemsEle.appendChild(cachedSellBtn);

            // Add vision upgrade buttons (only for towers)
            if (thing.gameType === "Tower") {
                // Observer upgrade button
                if (thing.visionType === VisionType.NONE || thing.visionType === VisionType.OBSERVER) {
                    if (thing.canUpgradeVision?.(VisionType.OBSERVER)) {
                        const price = thing.getVisionUpgradePrice?.(VisionType.OBSERVER) ?? 0;
                        const observerText = cachedObserverBtn.querySelector(".inner-text") as HTMLElement;
                        const currentLevel = thing.visionType === VisionType.OBSERVER ? (thing.visionLevel ?? 0) : 0;
                        observerText.innerHTML = `观察塔${currentLevel > 0 ? 'Lv' + (currentLevel + 1) : ''}<br>${price}元`;
                        otherItemsEle.appendChild(cachedObserverBtn);
                    }
                }
                // Radar upgrade button
                if (thing.visionType === VisionType.NONE || thing.visionType === VisionType.RADAR) {
                    if (thing.canUpgradeVision?.(VisionType.RADAR)) {
                        const price = thing.getVisionUpgradePrice?.(VisionType.RADAR) ?? 0;
                        const radarText = cachedRadarBtn.querySelector(".inner-text") as HTMLElement;
                        const currentLevel = thing.visionType === VisionType.RADAR ? (thing.visionLevel ?? 0) : 0;
                        radarText.innerHTML = `雷达塔${currentLevel > 0 ? 'Lv' + (currentLevel + 1) : ''}<br>${price}元`;
                        otherItemsEle.appendChild(cachedRadarBtn);
                    }
                }
            }
        });
    }

    /**
     * Show mine panel (optimized with DOM caching + RAF)
     */
    function showMinePanel(mine: Mine, screenPos: Vector) {
        if ((mine as any).inValidTerritory === false) {
            let et = new EffectText("无效领地内无法操作！");
            et.pos = mine.pos.copy();
            world.addEffect(et as any);
            requestPauseRender();
            return;
        }
        // Update current state for event delegation (immediate, needed for click handlers)
        currentPanelMine = mine;
        currentMineScreenPos = screenPos;
        currentPanelEntity = null;
        currentClickPos = null;

        // Schedule DOM updates via requestAnimationFrame
        schedulePanelUpdate(() => {
            smallLevelUpPanelEle.style.display = "block";
            smallLevelUpPanelEle.style.left = screenPos.x + 10 + "px";
            smallLevelUpPanelEle.style.top = screenPos.y + 10 + "px";
            let nameSpan = smallLevelUpPanelEle.querySelector(".name") as HTMLElement;

            // Clear lists using cached references
            while (listEle.firstChild) {
                listEle.removeChild(listEle.firstChild);
            }
            while (otherItemsEle.firstChild) {
                otherItemsEle.removeChild(otherItemsEle.firstChild);
            }

            if (mine.state === Mine.STATE_NORMAL) {
                nameSpan.innerHTML = "矿井";
                let upgradePrice = mine.getUpgradePrice();
                // Reuse first item from pool
                let upgradeBtn = levelUpItemPool[0];
                const nameDiv = upgradeBtn.querySelector(".name") as HTMLElement;
                nameDiv.innerText = "升级为发电厂";
                const iconDiv = upgradeBtn.querySelector(".icon") as HTMLElement;
                iconDiv.style.display = "none";
                const priceDiv = upgradeBtn.querySelector(".price") as HTMLElement;
                priceDiv.innerText = `${upgradePrice}元`;
                upgradeBtn.setAttribute("data-price", upgradePrice!.toString());
                upgradeBtn.setAttribute("data-mine-action", "upgrade");
                listEle.appendChild(upgradeBtn);

            } else if (mine.state === Mine.STATE_DAMAGED) {
                nameSpan.innerHTML = "毁坏的矿井";
                if (mine.repairing) {
                    let progressText = document.createElement("p");
                    progressText.innerText = `修复中... ${Math.floor(mine.repairProgress / mine.REPAIR_TIME * 100)}%`;
                    listEle.appendChild(progressText);
                } else {
                    let repairBtn = levelUpItemPool[0];
                    const nameDiv = repairBtn.querySelector(".name") as HTMLElement;
                    nameDiv.innerText = "修复矿井";
                    const iconDiv = repairBtn.querySelector(".icon") as HTMLElement;
                    iconDiv.style.display = "none";
                    const priceDiv = repairBtn.querySelector(".price") as HTMLElement;
                    priceDiv.innerText = `${mine.REPAIR_COST}元`;
                    repairBtn.setAttribute("data-price", mine.REPAIR_COST.toString());
                    repairBtn.setAttribute("data-mine-action", "repair");
                    listEle.appendChild(repairBtn);
                }

            } else if (mine.state === Mine.STATE_POWER_PLANT) {
                nameSpan.innerHTML = `${mine.powerPlantLevel}级发电厂`;

                let upgradePrice = mine.getUpgradePrice();
                if (upgradePrice !== null) {
                    let upgradeBtn = levelUpItemPool[0];
                    const nameDiv = upgradeBtn.querySelector(".name") as HTMLElement;
                    nameDiv.innerText = `升级到${mine.powerPlantLevel + 1}级`;
                    const iconDiv = upgradeBtn.querySelector(".icon") as HTMLElement;
                    iconDiv.style.display = "none";
                    const priceDiv = upgradeBtn.querySelector(".price") as HTMLElement;
                    priceDiv.innerText = `${upgradePrice}元`;
                    upgradeBtn.setAttribute("data-price", upgradePrice.toString());
                    upgradeBtn.setAttribute("data-mine-action", "upgrade");
                    listEle.appendChild(upgradeBtn);
                } else {
                    let maxLevelText = document.createElement("p");
                    maxLevelText.innerText = "已经是最高等级！";
                    listEle.appendChild(maxLevelText);
                }

                // Downgrade - reuse cached button
                let downgradeRefund = mine.getDowngradeRefund();
                let downgradeText = mine.powerPlantLevel > 1
                    ? `降为${mine.powerPlantLevel - 1}级`
                    : "降为矿井";
                const levelDownTextEl = cachedLevelDownBtn.querySelector(".inner-text") as HTMLElement;
                levelDownTextEl.innerHTML = `${downgradeText}<br>+${downgradeRefund}元`;
                cachedLevelDownBtn.setAttribute("data-refund", downgradeRefund.toString());
                otherItemsEle.appendChild(cachedLevelDownBtn);

                // Sell - reuse cached button
                let sellPrice = mine.getSellPrice();
                const sellTextEl = cachedSellBtn.querySelector(".inner-text") as HTMLElement;
                sellTextEl.innerHTML = `卖了<br>+${sellPrice}元`;
                cachedSellBtn.setAttribute("data-sell-price", sellPrice.toString());
                otherItemsEle.appendChild(cachedSellBtn);
            }
        });
    }

    /**
     * Canvas click handler
     */
    canvasEle.addEventListener('click', function (e) {
        try {
            if (inputHandler.wasDragging()) {
                return;
            }
            let rect = canvasEle.getBoundingClientRect();
            let screenPos = new Vector(e.clientX - rect.left, e.clientY - rect.top);
            let clickPos = world.camera.screenToWorld(screenPos);

        if (addedThingFunc === null) {
            for (let item of world.getAllBuildingArr()) {
                if ((item as any).getBodyCircle().pointIn(clickPos.x, clickPos.y)) {
                    if ((item as any).gameType === "Mine") {
                        showMinePanel(item as Mine, screenPos);
                        return;
                    }
                    showSmallLevelUpPanel(item as unknown as GameEntity, screenPos);
                    (item as any).selected = true;
                    return;
                }
            }
            for (let mine of world.mines) {
                if ((mine as any).getBodyCircle().pointIn(clickPos.x, clickPos.y)) {
                    showMinePanel(mine as Mine, screenPos);
                    return;
                }
            }
            for (let item of world.monsters) {
                if ((item as any).getBodyCircle().pointIn(clickPos.x, clickPos.y)) {
                    selectedThing = item as unknown as GameEntity;
                    showSelectedPanel(true);
                    (item as any).selected = true;
                    return;
                }
            }
            selectedThing = null;
            hideSmallLevelUpPanelEle();
        } else {
            let addedThing = addedThingFunc(world);
            if (world.user.money < addedThing.price) {
                let et = new EffectText("钱不够了！");
                et.pos = clickPos.copy();
                world.addEffect(et as any);
                return;
            }
            addedThing.pos = clickPos;
            for (let item of world.getAllBuildingArr()) {
                if (addedThing.getBodyCircle().impact((item as any).getBodyCircle())) {
                    let et = new EffectText("这里不能放建筑，换一个地方点一下");
                    et.pos = addedThing.pos.copy();
                    world.addEffect(et as any);
                    return;
                }
            }
            for (let obs of world.obstacles) {
                if (obs.intersectsCircle(addedThing.getBodyCircle() as any)) {
                    let et = new EffectText("这里有障碍物，不能放置建筑");
                    et.pos = addedThing.pos.copy();
                    world.addEffect(et as any);
                    return;
                }
            }
            if (world.territory && !world.territory.isPositionInValidTerritory(addedThing.pos)) {
                let et = new EffectText("只能在有效领地内放置建筑");
                et.pos = addedThing.pos.copy();
                world.addEffect(et as any);
                return;
            }
            world.user.money -= addedThing.price;
            switch (addedThing.gameType) {
                case "Tower":
                    world.addTower(addedThing as any);
                    break;
                case "Building":
                    world.addBuilding(addedThing as any);
                    break;
            }
        }
        } catch (error) {
            console.error("Canvas click error:", error);
            let et = new EffectText("放置出错！请刷新浏览器重试");
            et.pos = new Vector(world.width / 2, world.height / 2);
            world.addEffect(et as any);
        }
        requestPauseRender();
    }, { signal: eventSignal });

    /**
     * Mouse move handler
     */
    let cachedBuilding: GameEntity | null = null;
    let lastAddedFunc: ((world: unknown) => GameEntity) | null = null;

    canvasEle.addEventListener('mousemove', function (e) {
        if (addedThingFunc === null) {
            cachedBuilding = null;
            lastAddedFunc = null;
            return;
        }
        if (lastAddedFunc !== addedThingFunc) {
            cachedBuilding = addedThingFunc(world);
            lastAddedFunc = addedThingFunc;
        }
        world.user.putLoc.building = cachedBuilding as any;

        let rect = canvasEle.getBoundingClientRect();
        let screenPos = new Vector(e.clientX - rect.left, e.clientY - rect.top);
        let worldPos = world.camera.screenToWorld(screenPos);

        world.user.putLoc.x = worldPos.x;
        world.user.putLoc.y = worldPos.y;
        requestPauseRender();
    }, { signal: eventSignal });

    /**
     * Button state update
     */
    let freshBtn = setInterval(() => {
        let towerBtnArr = document.getElementsByClassName(btnClassName);

        let basicC = ((TowerFinallyCompat as any).BasicCannon as (world: unknown) => GameEntity)(world);
        towerBtnArr[0].setAttribute("data-price", basicC.price.toString());
        towerBtnArr[0].innerHTML = basicC.name + `<br>${basicC.price}￥`;
        for (let i = 0; i < towerBtnArr.length; i++) {
            let btn = towerBtnArr[i] as HTMLElement;
            if (parseInt(btn.dataset.price!) <= world.user.money) {
                btn.removeAttribute("disabled");
            } else {
                btn.setAttribute("disabled", "disabled");
            }
        }
        if (gameEnd) {
            clearInterval(freshBtn);
        }
        let cancelSelectBtn = document.getElementById("cancelSelect");
        if (cancelSelectBtn) {
            if (addedThingFunc === null) {
                cancelSelectBtn.setAttribute("disabled", "disabled");
            } else {
                cancelSelectBtn.removeAttribute("disabled");
            }
        }
        let itemArr = smallLevelUpPanelEle.getElementsByClassName("levelUpItem");
        for (let i = 0; i < itemArr.length; i++) {
            let itemEle = itemArr[i] as HTMLElement;
            if (parseInt(itemEle.dataset.price!) <= world.user.money) {
                itemEle.removeAttribute("disabled");
                itemEle.style.opacity = "1";
            } else {
                itemEle.setAttribute("disabled", "disabled");
                itemEle.style.opacity = "0.2";
            }
        }
    }, 100);

    } // end of startGameLoop function
}
