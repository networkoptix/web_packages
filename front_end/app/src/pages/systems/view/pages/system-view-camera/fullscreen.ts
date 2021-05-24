import { isDevMode } from '@angular/core';

const _logPrefix = 'FULLSCREEN ::';

function _log (...args: any[]) {
    if (isDevMode()) {
        console.log.apply(console, [_logPrefix, ...arguments]);
    }
}

function _warn (...args: any[]) {
    if (isDevMode()) {
        console.warn.apply(console, [_logPrefix, ...arguments]);
    }
}

function requestFullscreen (el) {
    if (!el) {
        return false;
    }
    const docEl = window.document.documentElement;
    const requestFullScreen =
        docEl.requestFullscreen ||
        docEl['mozRequestFullScreen'] ||
        docEl['webkitRequestFullScreen'] ||
        docEl['msRequestFullscreen']

    if (requestFullScreen) {
        _log('entering full screen', requestFullScreen);
        requestFullScreen.call(el);
    } else {
        _log('can not enter full screen', docEl);
    }
    return !!requestFullScreen;
}

function exitFullscreen () {
    const doc = window.document;
    const cancelFullScreen =
        doc.exitFullscreen ||
        doc['mozCancelFullScreen'] ||
        doc['webkitExitFullscreen'] ||
        doc['webkitCancelFullScreen'] ||
        doc['msExitFullscreen'];
    if (cancelFullScreen) {
        _log('leaving full screen', cancelFullScreen);
        cancelFullScreen.call(doc);
    } else {
        _log('can not leave fullscreen', doc);
    }
}

function getFullscreenElement () {
    return document.fullscreenElement || document['webkitFullscreenElement'];
}

export default {
    request    : requestFullscreen,
    exit       : exitFullscreen,
    getElement : getFullscreenElement
};
