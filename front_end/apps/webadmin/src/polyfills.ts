import { environment } from '@environments/environment';

import '@common/bootstrap';

// Required for: Safari MacOS 12-16.3, Safari iOS all
// @ts-expect-error: https://caniuse.com/mdn-api_element_requestfullscreen
Element.prototype.requestFullscreen ??= Element.prototype.webkitRequestFullscreen;

// Required for: Safari MacOS 12-16.3, Safari iOS all
// @ts-expect-error: https://caniuse.com/mdn-api_document_exitfullscreen
document.exitFullscreen ??= document.webkitExitFullscreen;

// Required for: Safari MacOS 12-16.3, Safari iOS all
// @ts-expect-error: https://caniuse.com/mdn-api_document_fullscreenelement
document.fullscreenElement ??= document.webkitFullscreenElement;

if (environment.production) {
    // Production
} else {
    // Development and test
    Error.stackTraceLimit = Infinity;
    // require('zone.js/dist/long-stack-trace-zone');
}
