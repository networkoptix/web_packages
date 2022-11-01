export function onPinch(el: HTMLElement, onPinchMove: Function = () => {}) {
    let distance;
    let scale = 1.0;
    let offset = 0.5;

    const onTouchMove = event => {
        if (event.touches.length === 2) {
            const currentDistance = Math.hypot(
                (event.touches[0].pageX - event.touches[1].pageX),
                (event.touches[0].pageY - event.touches[1].pageY)
            );

            if (distance === undefined) {
                distance = currentDistance;
                const x1 = event.touches[0].clientX;
                const x2 = event.touches[1].clientX;
                const targetRect = event.target.getBoundingClientRect();
                offset = ((x1 + x2) * 0.5 - targetRect.left) / targetRect.width;
            }

            const newScale = currentDistance / distance;
            const scaleChange = newScale / scale;
            onPinchMove({ newScale, scaleChange, offset });
            scale = newScale;
        }
    };

    const reset = () => {
        distance = undefined;
        scale = 1.0;
        offset = 0.5;
    };

    el.addEventListener('touchmove', onTouchMove, false);
    document.addEventListener('touchend', reset);
    document.addEventListener('touchcancel', reset);

    return () => {
        el.removeEventListener('touchmove', onTouchMove, false);
        document.removeEventListener('touchend', reset);
        document.removeEventListener('touchcancel', reset);
    };
}
