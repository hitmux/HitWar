/**
 * Static initialization data and canvas utilities
 * by littlefean
 */

// Device pixel ratio for canvas rendering
export const PR: number = window.devicePixelRatio;

/**
 * Canvas pixel standardization
 */
export function standardize(n: number): number {
    return Math.floor(n * PR);
}

/**
 * Draw a pixel-aligned line on canvas
 */
export function drawLine(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    lineWidth: number = 1,
    color: string = "black",
    isDash: boolean = false
): void {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.beginPath();
    if (isDash) {
        ctx.setLineDash([5, 5]);
    } else {
        ctx.setLineDash([]);
    }
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

/**
 * Draw rectangle stroke
 */
export function drawRectStroke(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    lineWidth: number
): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.strokeRect(x, y, width, height);
}

/**
 * Draw filled rectangle
 */
export function drawRectFill(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
): void {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
}

/**
 * Write text on canvas
 */
export function writeFont(
    ctx: CanvasRenderingContext2D,
    content: string,
    x: number,
    y: number,
    color: string = "black",
    fontSize: number = 20
): void {
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px "微软雅黑"`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(content, x, y);
}
