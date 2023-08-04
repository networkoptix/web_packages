import { px, pxPerSecond, color } from './types';

function drawWithClipRect(
    ctx: CanvasRenderingContext2D,
    x0: px,
    y0: px,
    w: px,
    h: px,
    draw: Function,
) {
    ctx.save();
    const clippingRect = new Path2D();
    clippingRect.rect(x0, y0, w, h);
    ctx.save();
    ctx.clip(clippingRect);
    draw();
    ctx.restore();
}

function drawSingleStripe(
    ctx: CanvasRenderingContext2D,
    x0: px,
    y0: px,
    stripeWidth: px,
    slopeWidth: px,
    h: px,
) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + slopeWidth, y0 - h);
    ctx.lineTo(x0 + slopeWidth + stripeWidth, y0 - h);
    ctx.lineTo(x0 + stripeWidth, y0);
    ctx.closePath();
    ctx.fill();
}

function getOffset(speed: pxPerSecond, period: px) {
    return Math.round(((Date.now() * speed) / 1000) % period);
}

export function drawStripyBar(
    ctx: CanvasRenderingContext2D,
    x0: px,
    y0: px,
    w: px,
    h: px,
    stripeWidth: px,
    slopeWidth: px,
    speed: pxPerSecond,
    backgroundColor: color,
    stripeColor: color,
) {
    const tw = stripeWidth + slopeWidth;
    drawWithClipRect(ctx, x0, y0, w, h, () => {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(x0, y0, w, h);
        ctx.fillStyle = stripeColor;
        const offset = getOffset(speed, 2 * stripeWidth);
        for (let x = x0 - tw; x < x0 + w + tw; x += 2 * stripeWidth) {
            drawSingleStripe(ctx, x - offset, y0 + h, stripeWidth, slopeWidth, h);
        }
    });
}
