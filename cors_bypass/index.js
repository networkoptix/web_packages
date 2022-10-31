// Listen on a specific host via the HOST environment variable
const corsBypass = process.env.CORS_BYPASS || 'http://localhost:42069/';
// Listen on a specific port via the PORT environment variable
const [protocol, path] = corsBypass.split('//');
const [host, port] = path.replace('/', '').split(':');

var cors_proxy = require('cors-anywhere');
cors_proxy.createServer({
    originWhitelist: [], // Allow all origins
    requireHeader: ['origin', 'x-requested-with'],
    removeHeaders: ['cookie', 'cookie2']
}).listen(port, host, function () {
    console.log(`Running CORS Anywhere on ${corsBypass}`);
});