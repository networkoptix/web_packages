const defaultCloud = 'https://cloud-test.hdw.mx';
const proxyTargetConfig = {
    local: {
        host: 'https://localhost:7001',
        cloud: defaultCloud
    }
};
const useProxy = process.env.WEBADMIN_TARGET || 'local';
const targets = proxyTargetConfig[useProxy];

console.log(`Running ${useProxy} w/ targets : ${JSON.stringify(targets)}`);

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
            // '/static/supported_languages.json',
            '/static/languages.json',
            '/swagger-ui',
            '/web',
            '/static'
        ],
        target: targets.host,
        changeOrigin: true,
        secure: false
    }, {
        context: [
            '/static/supported_languages.json',
            '/static/lang_en_US',
            '/static'
        ],
        target: targets.host,
        changeOrigin: true,
        secure: false,
        bypass: function (req, res, proxyOptions) {
            if (req.url.includes('/static/lang_en_US')) {
                return req.url.replace('/static/lang_en_US', '');
            }
            return req.url.replace('/static', '');
        }
    }, {
        context: [
            '/api/systems'
        ],
        target: targets.cloud,
        changeOrigin: true,
        secure: false
    }
];

module.exports = PROXY_CONFIG;
