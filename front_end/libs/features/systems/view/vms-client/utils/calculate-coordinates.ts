function findTouch(e: TouchEvent): Touch | undefined {
    return e.targetTouches?.[0] || e.changedTouches?.[0] || e.touches?.[0];
}

const isMouseEvent = (e: MouseEvent | TouchEvent): e is MouseEvent => e instanceof MouseEvent || 'screenX' in e;

export function calcClientX(e: MouseEvent | TouchEvent): number {
    let clientX: number;
    if (isMouseEvent(e)) {
        clientX = e.clientX;
    } else {
        clientX = findTouch(e).clientX || 0;
    }
    return clientX;
}

export function calcOffsetX(e: MouseEvent | TouchEvent): number {
    let offsetX: number;
    if (isMouseEvent(e)) {
        offsetX = e.offsetX;
    } else {
        const rect = (e.target as HTMLElement)?.getBoundingClientRect();
        offsetX = (findTouch(e)?.pageX || 0) - rect.left;
    }
    return offsetX;
}

export function calcOffsetY(e: MouseEvent | TouchEvent): number {
    let offsetY: number;
    if (isMouseEvent(e)) {
        offsetY = e.offsetY;
    } else {
        const rect = (e.target as HTMLElement)?.getBoundingClientRect();
        offsetY = (findTouch(e)?.pageY || 0) - rect.top;
    }
    return offsetY;
}

export function calcScreenX(e: MouseEvent | TouchEvent): number {
    let screenX: number;
    if (isMouseEvent(e)) {
        screenX = e.screenX;
    } else {
        screenX = findTouch(e)?.screenX || 0;
    }
    return screenX;
}
