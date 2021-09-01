import 'ngstorage';
import 'angular-route';
import 'bootstrap-sass';
import 'angular-resource';
import 'angular-sanitize';
import 'angular-ui-bootstrap';
import 'utf8';

import 'hint.css/hint.min.css';
import 'rangeslider.js/dist/rangeslider.css';
import '../styles/main.scss';

require('es6-promise/auto');
require('./config.js');
require('./bootstrap.js');

//App
require('./app.js');

//Vendor

//Services
require('./services/cloudAPI.js');
require('./services/mediaserver.js');

//Directives

//Controllers
require('./controllers/main.js');
require('./controllers/offline.js');


