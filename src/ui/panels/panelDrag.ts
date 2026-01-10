/**
 * Panel drag and resize manager
 * Handles dragging, resizing and localStorage persistence for panels
 */

interface PanelState {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
}

export class PanelDragManager {
    panel: HTMLElement;
    handle: HTMLElement;
    storageKey: string;

    isDragging: boolean = false;
    dragStartX: number = 0;
    dragStartY: number = 0;
    panelStartX: number = 0;
    panelStartY: number = 0;

    // Flag to prevent saving during initialization
    isInitialized: boolean = false;
    resizeObserver: ResizeObserver | null = null;
    resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(panelId: string, handleSelector: string, storageKey: string = 'panelState') {
        this.panel = document.getElementById(panelId)!;
        this.handle = this.panel.querySelector(handleSelector)!;
        this.storageKey = storageKey;

        this.init();
    }

    init(): void {
        this.loadState();
        this.bindDragEvents();

        // Delay ResizeObserver binding to avoid triggering during initialization
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.isInitialized = true;
                this.bindResizeEvents();
            });
        });
    }

    // Load saved state from localStorage
    loadState(): void {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const state: PanelState = JSON.parse(saved);

                // Apply position if saved
                if (state.left !== undefined && state.top !== undefined) {
                    this.panel.style.right = 'auto';
                    this.panel.style.bottom = 'auto';

                    // Use saved width/height for clamping calculation if available
                    const panelWidth = state.width || this.panel.offsetWidth;
                    const panelHeight = state.height || this.panel.offsetHeight;

                    // Clamp position to ensure panel stays visible
                    const maxLeft = Math.max(0, window.innerWidth - panelWidth);
                    const maxTop = Math.max(0, window.innerHeight - panelHeight);

                    this.panel.style.left = this.clamp(state.left, 0, maxLeft) + 'px';
                    this.panel.style.top = this.clamp(state.top, 0, maxTop) + 'px';
                }

                // Apply size if saved
                if (state.width !== undefined) {
                    this.panel.style.width = state.width + 'px';
                }
                if (state.height !== undefined) {
                    this.panel.style.height = state.height + 'px';
                }
            }
        } catch (e) {
            console.warn('Failed to load panel state:', e);
        }
    }

    // Save current state to localStorage
    saveState(): void {
        // Don't save during initialization
        if (!this.isInitialized) return;

        try {
            const rect = this.panel.getBoundingClientRect();

            // Don't save if panel is not visible or has invalid dimensions
            if (rect.width <= 0 || rect.height <= 0) return;

            const state: PanelState = {
                left: Math.round(rect.left),
                top: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            };
            localStorage.setItem(this.storageKey, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save panel state:', e);
        }
    }

    clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    bindDragEvents(): void {
        // Mouse events
        this.handle.addEventListener('mousedown', (e) => this.onDragStart(e));
        document.addEventListener('mousemove', (e) => this.onDragMove(e));
        document.addEventListener('mouseup', () => this.onDragEnd());

        // Touch events
        this.handle.addEventListener('touchstart', (e) => this.onDragStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.onDragMove(e), { passive: false });
        document.addEventListener('touchend', () => this.onDragEnd());
    }

    onDragStart(e: MouseEvent | TouchEvent): void {
        e.preventDefault();
        this.isDragging = true;
        this.panel.classList.add('dragging');

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        this.dragStartX = clientX;
        this.dragStartY = clientY;

        const rect = this.panel.getBoundingClientRect();
        this.panelStartX = rect.left;
        this.panelStartY = rect.top;

        this.panel.style.right = 'auto';
        this.panel.style.bottom = 'auto';
        this.panel.style.left = rect.left + 'px';
        this.panel.style.top = rect.top + 'px';
    }

    onDragMove(e: MouseEvent | TouchEvent): void {
        if (!this.isDragging) return;
        e.preventDefault();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - this.dragStartX;
        const deltaY = clientY - this.dragStartY;

        let newLeft = this.panelStartX + deltaX;
        let newTop = this.panelStartY + deltaY;

        const rect = this.panel.getBoundingClientRect();
        newLeft = this.clamp(newLeft, 0, window.innerWidth - rect.width);
        newTop = this.clamp(newTop, 0, window.innerHeight - rect.height);

        this.panel.style.left = newLeft + 'px';
        this.panel.style.top = newTop + 'px';
    }

    onDragEnd(): void {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.panel.classList.remove('dragging');
        this.saveState();
    }

    bindResizeEvents(): void {
        this.resizeObserver = new ResizeObserver(() => {
            // Don't save during initialization or dragging
            if (!this.isInitialized || this.isDragging) return;

            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            this.resizeTimeout = setTimeout(() => {
                this.saveState();
            }, 200);
        });
        this.resizeObserver.observe(this.panel);
    }

    // Reset to default position
    resetToDefault(): void {
        localStorage.removeItem(this.storageKey);
        this.panel.style.left = '';
        this.panel.style.top = '';
        this.panel.style.right = '20px';
        this.panel.style.bottom = '20px';
        this.panel.style.width = '';
        this.panel.style.height = '';
    }

    // Clean up resources
    destroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
    }
}
