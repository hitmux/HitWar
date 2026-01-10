/**
 * SaveUI - Handles UI interactions for save/load functionality
 */

import { SaveManager } from './saveManager';

interface SaveData {
    mode: string;
    haveFlow: boolean;
    timestamp: number;
}

interface WorldLike {
    [key: string]: unknown;
}

export class SaveUI {
    /**
     * Show continue game dialog
     */
    static showContinueDialog(timestamp: number, onContinue: () => void, onNew: () => void): void {
        // Create dialog overlay
        const overlay = document.createElement("div");
        overlay.id = "saveDialogOverlay";
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        // Create dialog box
        const dialog = document.createElement("div");
        dialog.style.cssText = `
            background: #2a2a2a;
            border: 2px solid #4a4a4a;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            color: white;
            font-family: "Microsoft YaHei", sans-serif;
            min-width: 300px;
        `;

        // Title
        const title = document.createElement("h3");
        title.textContent = "发现存档";
        title.style.cssText = `
            margin: 0 0 15px 0;
            font-size: 24px;
            color: #ffd700;
        `;
        dialog.appendChild(title);

        // Save time info
        const timeInfo = document.createElement("p");
        timeInfo.textContent = `存档时间: ${SaveManager.formatTimestamp(timestamp)}`;
        timeInfo.style.cssText = `
            margin: 0 0 20px 0;
            font-size: 14px;
            color: #aaa;
        `;
        dialog.appendChild(timeInfo);

        // Question
        const question = document.createElement("p");
        question.textContent = "是否继续上次的游戏？";
        question.style.cssText = `
            margin: 0 0 25px 0;
            font-size: 16px;
        `;
        dialog.appendChild(question);

        // Button container
        const btnContainer = document.createElement("div");
        btnContainer.style.cssText = `
            display: flex;
            gap: 15px;
            justify-content: center;
        `;

        // Continue button
        const continueBtn = document.createElement("button");
        continueBtn.textContent = "继续游戏";
        continueBtn.style.cssText = `
            padding: 12px 25px;
            font-size: 16px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.3s;
        `;
        continueBtn.onmouseover = () => continueBtn.style.background = "#45a049";
        continueBtn.onmouseout = () => continueBtn.style.background = "#4CAF50";
        continueBtn.onclick = () => {
            document.body.removeChild(overlay);
            onContinue();
        };
        btnContainer.appendChild(continueBtn);

        // New game button
        const newBtn = document.createElement("button");
        newBtn.textContent = "新游戏";
        newBtn.style.cssText = `
            padding: 12px 25px;
            font-size: 16px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.3s;
        `;
        newBtn.onmouseover = () => newBtn.style.background = "#da190b";
        newBtn.onmouseout = () => newBtn.style.background = "#f44336";
        newBtn.onclick = () => {
            document.body.removeChild(overlay);
            onNew();
        };
        btnContainer.appendChild(newBtn);

        dialog.appendChild(btnContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    /**
     * Add export button to game interface
     */
    static addExportButton(container: HTMLElement, getWorld: () => WorldLike | null): HTMLButtonElement {
        const btn = document.createElement("button");
        btn.textContent = "导出存档";
        btn.className = "exportSaveBtn";
        btn.onclick = () => {
            const world = getWorld();
            if (world) {
                const saveData = SaveManager.serialize(world as any);
                SaveManager.exportToFile(saveData);
            }
        };
        container.appendChild(btn);
        return btn;
    }

    /**
     * Add import button to main interface
     */
    static addImportButton(container: HTMLElement, onLoad: (saveData: SaveData) => void): HTMLButtonElement {
        const btn = document.createElement("button");
        btn.textContent = "导入存档";
        btn.className = "importSaveBtn";

        // Hidden file input
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".json";
        fileInput.style.display = "none";

        fileInput.onchange = async (e) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) return;

            try {
                const saveData = await SaveManager.importFromFile(file);
                onLoad(saveData as SaveData);
            } catch (error) {
                alert("导入失败: " + (error as Error).message);
            }
            // Reset file input
            fileInput.value = "";
        };

        btn.onclick = () => fileInput.click();

        container.appendChild(fileInput);
        container.appendChild(btn);
        return btn;
    }

    /**
     * Show auto-save indicator
     */
    static showAutoSaveIndicator(): void {
        let indicator = document.getElementById("autoSaveIndicator");
        if (!indicator) {
            indicator = document.createElement("div");
            indicator.id = "autoSaveIndicator";
            indicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.7);
                color: #4CAF50;
                padding: 10px 15px;
                border-radius: 5px;
                font-size: 14px;
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.3s;
            `;
            indicator.textContent = "已自动保存";
            document.body.appendChild(indicator);
        }

        // Show indicator
        indicator.style.opacity = "1";

        // Hide after 2 seconds
        setTimeout(() => {
            if (indicator) {
                indicator.style.opacity = "0";
            }
        }, 2000);
    }

    /**
     * Show import success message and start game
     */
    static showImportSuccess(saveData: SaveData): void {
        const modeText: Record<string, string> = {
            "easy": "简单",
            "normal": "普通",
            "hard": "困难"
        };
        const flowText = saveData.haveFlow ? "波次模式" : "无尽时间模式";
        alert(`存档导入成功！\n模式: ${modeText[saveData.mode]} - ${flowText}\n存档时间: ${SaveManager.formatTimestamp(saveData.timestamp)}`);
    }
}
