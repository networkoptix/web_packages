import { environment } from '@environments/environment';
// import { InterceptorManager } from '@utils/interceptor-manager';

import 'zone.js';

import 'rvfc-polyfill';

const supportsContainerQueries = 'container' in document.documentElement.style;

if (!supportsContainerQueries) {
    import('container-query-polyfill');
}

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
    require('zone.js/dist/long-stack-trace-zone');
}

// Needs to be registered before the app is bootstrapped to work with vms in client api.
// TODO: Need to figure out how to register correctly without fully initializing interceptor.
// InterceptorManager.getInstance();
