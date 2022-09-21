export function generateClickDubleClickPair(onClick, onDblClick, dblClickDelayMs = 300) {
    let scheduledHandler = null;
    let prevClickTime = null;

    return function (e) {
        const now = Date.now();
        if (scheduledHandler) {
            const timePassed = now - prevClickTime;
            if (timePassed < dblClickDelayMs) {
                clearTimeout(scheduledHandler);
                scheduledHandler = null;
                onDblClick();
            }
        } else {
            scheduledHandler = setTimeout(() => {
                scheduledHandler = null;
                prevClickTime = null;
                onClick(e);
            }, dblClickDelayMs);
            prevClickTime = now;
        }
    };
}
