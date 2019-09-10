import 'angular';
import 'ngstorage';
import 'angular-route';
import 'angular-base64';
import 'angular-cookies';
import 'angular-resource';
import 'angular-sanitize';
import '@ng-bootstrap/ng-bootstrap';
import 'angular-clipboard';
import 'jquery-mousewheel';
import 'what-input';

import '../styles/main.scss';
import '../app.component.scss';

require('./client-detection.js');

//Vendor
require('./vendor/protocolcheck.js');

//App
require('./app.js');

//Directives
require('./directives/process.js');
require('./directives/setTitle.js');

//Filters
require('./filters/escape.js');

//Services
require('./services/angular-uuid2.ts');
require('./services/cloud_api.ts');
require('./services/language.ts');
require('./services/mediaserver.js');
require('./services/page.js');
require('./services/poll.js');
require('./services/process.ts');
require('./services/system.ts');
require('./services/location-proxy.ts');

//Controllers
require('./controllers/view.js');
