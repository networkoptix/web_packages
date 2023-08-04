const defaultCloud = 'https://cloud-test.hdw.mx';
const proxyTargetConfig = {
    brova: {
        host: 'http://brova.mykeenetic.ru:7001',
        cloud: defaultCloud,
    },
    demo: {
        host: 'http://demo.networkoptix.com:7001',
        cloud: defaultCloud,
    },
    local: {
        host: 'https://localhost:7001',
        cloud: defaultCloud,
    },
    nuke: {
        host: 'https://10.1.5.210:7001',
        cloud: defaultCloud,
    },
    sofia: {
        host: 'https://192.168.99.113:7001',
        cloud: defaultCloud,
    },
    amir1: {
        host: 'https://10.0.0.120:7001',
        cloud: defaultCloud,
    },
    amir2: {
        host: 'https://10.0.0.153:7001',
        cloud: defaultCloud,
    },
    webpi: {
        host: 'https://10.1.5.111:7001',
        cloud: 'https://dev3.cloud.hdw.mx',
    },
};

const host = process.env.WEBADMIN_TARGET || 'local';
const cloud = process.env.CLOUD_TARGET || 'cloud-test.hdw.mx';
const targets = proxyTargetConfig[host] || {
    host,
    cloud,
};

console.log(`Running ${host} w/ targets : ${JSON.stringify(targets)}`);

const PROXY_CONFIG = [
    {
        context: [
            '/api',
            '/ec2',
            '/hls',
            '/proxy',
            '/rest',
            '/static/customization',
            '/static/lang_ru_RU',
            '/static/lang_ja_JP',
            '/static/images/logo.png',
            '/static/supported_languages.json', // Comment out to use your own supported_languages.json.
            '/static/languages.json',
            '/swagger-ui',
            '/web',
            '/webrtc-tracker',
            '/josnrpc',
            '/static/openapi_v1.json',
            '/static/openapi_manifest.json',
            '/static/openapi_legacy.json',
            '/static/openapi_deprecated.json',
            '/static/openapi.json',
            '/static/version.txt',
        ],
        target: targets.host,
        changeOrigin: true,
        secure: false,
        ws: true,
    },
    {
        context: [
            // '/static/supported_languages.json', // Uncomment for using your own local supported_languages.json. It goes in front_end/app/supported_languages.
            '/static/lang_en_US',
            '/static',
        ],
        target: 'https://localhost:9001',
        changeOrigin: true,
        secure: false,
        bypass: function (req, res, proxyOptions) {
            if (req.url.includes('/static/lang_en_US')) {
                return req.url.replace('/static/lang_en_US', '');
            }
            return req.url.replace('/static', '');
        },
    },
    {
        context: ['/api/systems'],
        target: targets.cloud,
        changeOrigin: true,
        secure: false,
    },
];

module.exports = PROXY_CONFIG;
