function getReqFullscreen() {
    const root = document.documentElement;
    // @ts-ignore
    return root.requestFullscreen || root.webkitRequestFullscreen || root.mozRequestFullScreen || root.msRequestFullscreen;
}

function getExitFullscreen() {
    // @ts-ignore
    return document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
}

function getFullscreenElement() {
    // @ts-ignore
    return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
}

export default {
    request: getReqFullscreen,
    exit: getExitFullscreen,
    getElement: getFullscreenElement
};
