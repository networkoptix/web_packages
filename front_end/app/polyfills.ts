/***************************************************************************************************
 * Load `$localize` onto the global scope - used if i18n tags appear in Angular templates.
 */
import '@angular/localize/init';
/** do we really need these polyfills? ... we don't support IE (es5) and build target is es2015 ****
// import 'core-js/es';
// import 'core-js/features/reflect';
// import 'core-js/features/object'; // IE 11 needs Object.entries
// import 'core-js/features/array';
*/

import { environment } from '@environments/environment';

import 'zone.js';

if (!Element.prototype.matches) {
    Element.prototype.matches = (<any>Element.prototype).msMatchesSelector ||
          Element.prototype.webkitMatchesSelector;
}

if (environment.production) {
    // Production
} else {
    // Development and test
    Error.stackTraceLimit = Infinity;
    require('zone.js/dist/long-stack-trace-zone');
}
