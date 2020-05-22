import 'core-js/es';
import 'core-js/features/reflect';
import 'core-js/features/object';   // IE 11 needs Object.entries
import 'core-js/features/array';   // IE 11 needs includes()

require('zone.js/dist/zone');

if (!Element.prototype.matches) {
  Element.prototype.matches = (<any>Element.prototype).msMatchesSelector ||
          Element.prototype.webkitMatchesSelector;
}

if (process.env.ENV === 'production') {
  // Production
} else {
  // Development and test
  Error['stackTraceLimit'] = Infinity;
  require('zone.js/dist/long-stack-trace-zone');
}
