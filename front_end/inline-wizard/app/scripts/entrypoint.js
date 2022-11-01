import 'ngstorage';
import 'angular-route';
import 'bootstrap-sass';
import 'angular-resource';
import 'angular-sanitize';
import 'angular-ui-bootstrap';

import '../styles/nativeclient.scss';
import '../styles/webadminclient.scss';

require('es6-promise/auto');
require('./config.js');
require('./bootstrap.js');

//App
require('./app.js');

//Services
require('./services/cloudAPI.js');
require('./services/systemAPI.js');
require('./services/dialogs.js');
require('./services/mediaserver.js');
require('./services/nativeClient.js');
require('./services/poll.js');

//Directives
require('./directives/autofocus.js');
require('./directives/debug.js');
require('./directives/disableAutocomplete.js');
require('./directives/networkSettings.js');
require('./directives/passwordInput.js');
require('./directives/validateEmail.js');
require('./directives/validateField.js');

//Controllers
require('./controllers/dialogs/setup.js');
