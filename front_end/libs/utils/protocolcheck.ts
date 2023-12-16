type Callback = () => void;

function createHiddenIframe(target: HTMLElement, uri: string): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.src = uri;
    iframe.id = 'hiddenIframe';
    iframe.style.display = 'none';
    target.appendChild(iframe);

    return iframe;
}

function addBlurListener(
    target: Window,
    successCb: Callback,
    failCb: Callback,
    timeout: number = 1000,
): void {
    // eslint-disable-next-line prefer-const
    let timeoutID: number;

    function onBlur(): void {
        clearTimeout(timeoutID);
        target.removeEventListener('blur', onBlur);
        successCb();
    }

    timeoutID = window.setTimeout(() => {
        failCb();
        target.removeEventListener('blur', onBlur);
    }, timeout);

    target.addEventListener('blur', onBlur);
}

/**
 * Use hidden iframe onBlur to detect whether focus is stolen.
 *
 * When focus is stolen, it assumed that the custom protocol is launching
 * an external app and therefore it exists.
 */
function openUriWithHiddenFrame(
    uri: string,
    successCb: Callback,
    failCb: Callback,
    timeout: number,
): void {
    const iframe =
        document.querySelector<HTMLIFrameElement>('#hiddenIframe') ??
        createHiddenIframe(document.body, 'about:blank');

    addBlurListener(window, successCb, failCb, timeout);
    iframe.contentWindow.location.href = uri;
}

/**
 * Use window onBlur to detect whether focus is stolen from the browser.
 *
 * When focus is stolen, it assumes that the custom protocol is launching
 * an external app and therefore it exists.
 */
function openUriWithTimeoutHack(
    uri: string,
    successCb: Callback,
    failCb: Callback,
    timeout: number,
): void {
    // handle page running in an iframe (blur must be registered with top level window)
    let target: Window = window;
    while (target !== target.parent) {
        target = target.parent;
    }

    addBlurListener(target, successCb, failCb, timeout);
    window.location.href = uri;
}

function isChromium(): boolean {
    // @ts-expect-error Only in Chromium browsers
    return !!window.chrome;
}

function isFirefox(): boolean {
    return navigator.userAgent.includes('Firefox');
}

function isDesktopSafari(): boolean {
    // @ts-expect-error Only in desktop Safari
    return !!window.safari;
}

function isMobile(): boolean {
    return ['Android', 'iPhone', 'iPad', 'iPod'].some(agent => navigator.userAgent.includes(agent));
}

export const OPEN_DESKTOP_CLIENT_TIMEOUT_MS = 4000;
export const OPEN_MOBILE_CLIENT_TIMEOUT_MS = 300;

/**
 * Detect whether a custom protocol is available in browser.
 *
 * Unfortunately, browser detection and protocol detection are both
 * undocumented and unstandardized, which means either could break with
 * any given update.
 *
 * Browsers to support: https://networkoptix.atlassian.net/wiki/spaces/SD/pages/771031360/Supported+OS+and+versions
 *
 * Original source: https://github.com/vireshshah/custom-protocol-check
 */
export function protocolCheck(uri: string, successCb: Callback, failCb: Callback): void {
    const timeout = !isMobile() ? OPEN_DESKTOP_CLIENT_TIMEOUT_MS : OPEN_MOBILE_CLIENT_TIMEOUT_MS;
    if (isChromium()) {
        // Windows/MacOS/Linux/Android Chrome/Edge/Opera
        openUriWithTimeoutHack(uri, successCb, failCb, timeout);
    } else if (isFirefox()) {
        // Windows/MacOS/Linux/Android Firefox
        openUriWithHiddenFrame(uri, successCb, failCb, timeout);
    } else if (isDesktopSafari()) {
        // MacOS Safari
        openUriWithHiddenFrame(uri, successCb, failCb, OPEN_DESKTOP_CLIENT_TIMEOUT_MS);
    } else {
        // iOS browsers (all AppleWebKit based)
        openUriWithTimeoutHack(uri, successCb, failCb, timeout);
    }
}
