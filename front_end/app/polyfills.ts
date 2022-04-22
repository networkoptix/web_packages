/***************************************************************************************************
 * Load `$localize` onto the global scope - used if i18n tags appear in Angular templates.
 */
import '@angular/localize/init';

import { environment } from '@environments/environment';

import 'zone.js';

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
