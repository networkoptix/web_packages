// TODO: Move this into player component file
export function generateClickDubleClickPair(
    onClick: (e: MouseEvent) => void,
    onDblClick: (e: MouseEvent) => void,
    dblClickDelayMs = 300,
): (e: MouseEvent) => void {
    let scheduledHandler: number = null;
    let prevClickTime: number = null;

    return function (e) {
        const now = Date.now();
        if (scheduledHandler) {
            const timePassed = now - prevClickTime;
            if (timePassed < dblClickDelayMs) {
                clearTimeout(scheduledHandler);
                scheduledHandler = null;
                onDblClick(e);
            }
        } else {
            scheduledHandler = window.setTimeout(() => {
                scheduledHandler = null;
                prevClickTime = null;
                onClick(e);
            }, dblClickDelayMs);
            prevClickTime = now;
        }
    };
}
