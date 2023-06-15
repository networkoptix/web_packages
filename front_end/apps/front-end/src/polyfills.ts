import { environment } from '@environments/environment';
// import { InterceptorManager } from '@utils/interceptor-manager';

import 'zone.js';

import 'rvfc-polyfill';

if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.webkitMatchesSelector;
}

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
