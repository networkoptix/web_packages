const proxyTargetConfig = {
    'cloud-test': 'https://cloud-test.hdw.mx',
    dev2: 'https://dev2.cloud.hdw.mx',
    dev3: 'https://dev3.cloud.hdw.mx',
    local: 'http://localhost:8000',
    prod: 'https://nxvms.com',
    stage: 'https://stage.nxvms.com',
    meta: 'https://meta.nxvms.com',
    regress: 'https://regress.cloud.hdw.mx',
    qa: 'https://qa.cloud.hdw.mx',
};
const target = process.env.CLOUD_TARGET || 'cloud-test';
const PROXY_CONFIG = [
    {
        context: [
            '/cdb',
            '/api',
            '/oauth',
            // mediaserver specific apis
            '/ec2',
            '/hls',
            '/proxy',
            '/rest',
            '/web',
            // django admin proxies
            '/admin',
            '/static/admin',
            '/static/admin_tools',
            '/static/bootstrap',
            '/static/css/main.css',
            // static content from cloud
            '/static/503.html',
            '/static/customization',
            '/static/lang_en_US',
            '/static/lang_ru_RU',
            '/static/lang_es_ES',
            '/static/styles',
            '/static/images',
            '/static/fonts',
            '/swagger-ui',
            '/static/scripts/commonPasswordsList.json',
        ],
        target: proxyTargetConfig[target],
        changeOrigin: true,
        secure: false,
        bypass: function (req, res, proxyOptions) {
            req.headers.origin = proxyTargetConfig[target];
        },
    },
    {
        context: [
            // '/static/lang_en_US',
            '/static',
        ],
        target: 'https://localhost:9002',
        changeOrigin: true,
        secure: false,
        bypass: function (req, res, proxyOptions) {
            if (req.url.includes('/static/lang_en_US')) {
                return req.url.replace('/static/lang_en_US', '');
            }
            return req.url.replace('/static', '');
        },
    },
];

module.exports = PROXY_CONFIG;
