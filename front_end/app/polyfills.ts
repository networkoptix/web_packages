/***************************************************************************************************
 * Load `$localize` onto the global scope - used if i18n tags appear in Angular templates.
 */
import '@angular/localize/init';
import 'core-js/es';
import 'core-js/features/reflect';
import 'core-js/features/object'; // IE 11 needs Object.entries
import 'core-js/features/array';
import { environment } from './environments/environment';

require('hidpi-canvas/dist/hidpi-canvas');
require('zone.js/dist/zone');

if (!Element.prototype.matches) {
    Element.prototype.matches = (<any>Element.prototype).msMatchesSelector ||
          Element.prototype.webkitMatchesSelector;
}

if (environment.production) {
    // Production
} else {
    // Development and test
    Error['stackTraceLimit'] = Infinity;
    require('zone.js/dist/long-stack-trace-zone');
}
