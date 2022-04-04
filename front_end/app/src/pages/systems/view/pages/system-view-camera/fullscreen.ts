function getReqFullscreen() {
    const root = document.documentElement;
    // @ts-expect-error
    return root.requestFullscreen || root.webkitRequestFullscreen || root.mozRequestFullScreen || root.msRequestFullscreen;
}

function getExitFullscreen() {
    // @ts-expect-error
    return document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
}

function getFullscreenElement() {
    // @ts-expect-error
    return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
}

export const fullscreen = {
    request: getReqFullscreen,
    exit: getExitFullscreen,
    getElement: getFullscreenElement
};
