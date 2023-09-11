// TODO: Move these to main polyfill file

function getReqFullscreen(): Document['documentElement']['requestFullscreen'] {
    const root = document.documentElement;
    // @ts-expect-error: https://caniuse.com/mdn-api_element_requestfullscreen
    // eslint-disable-next-line prettier/prettier
    return root.requestFullscreen || root.webkitRequestFullscreen || root.mozRequestFullScreen || root.msRequestFullscreen;
}

function getExitFullscreen(): Document['exitFullscreen'] {
    // @ts-expect-error: https://caniuse.com/mdn-api_document_exitfullscreen
    // eslint-disable-next-line prettier/prettier
    return document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
}

function getFullscreenElement(): Document['fullscreenElement'] {
    // @ts-expect-error: https://caniuse.com/mdn-api_document_fullscreenelement
    // eslint-disable-next-line prettier/prettier
    return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
}

export const fullscreen = {
    request: getReqFullscreen,
    exit: getExitFullscreen,
    getElement: getFullscreenElement,
};
