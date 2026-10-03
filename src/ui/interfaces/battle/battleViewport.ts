/** Keep CSS pixels, canvas pixels and camera coordinates aligned after rotation. */
export function getCanvasViewportSize(canvas: HTMLCanvasElement): { width: number; height: number } {
    const rect = canvas.getBoundingClientRect();
    return {
        width: Math.max(1, Math.round(rect.width || canvas.clientWidth || 1200)),
        height: Math.max(1, Math.round(rect.height || canvas.clientHeight || 780)),
    };
}

export function observeBattleViewport(
    canvas: HTMLCanvasElement,
    resize: (width: number, height: number) => void,
): () => void {
    let previousWidth = 0;
    let previousHeight = 0;
    let frame: number | null = null;
    const update = () => {
        frame = null;
        const { width, height } = getCanvasViewportSize(canvas);
        if (width === previousWidth && height === previousHeight) return;
        previousWidth = width;
        previousHeight = height;
        resize(width, height);
    };
    const schedule = () => {
        if (frame === null) frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(canvas);
    update();
    return () => {
        observer.disconnect();
        if (frame !== null) cancelAnimationFrame(frame);
    };
}
