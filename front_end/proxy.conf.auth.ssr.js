const proxyTargetConfig = {
    'cloud-test': 'https://cloud-test.hdw.mx',
    dev2: 'https://dev2.cloud.hdw.mx',
    dev3: 'https://dev3.cloud.hdw.mx',
    local: 'http://localhost:8000',
    prod: 'https://nxvms.com',
    stage: 'https://stage.nxvms.com/',
};
const target = process.env.CLOUD_TARGET || 'cloud-test';

const defaultRouteConfig = {
    target: proxyTargetConfig[target],
    secure: false,
    changeOrigin: true,
};

const PROXY_CONFIG = [
    {
        '/api': defaultRouteConfig,
        '/oauth': defaultRouteConfig,
        '/rest': defaultRouteConfig,
        '/static/styles': defaultRouteConfig,
        '/static/images': defaultRouteConfig,
        '/static/fonts': defaultRouteConfig,
        '/static/lang_en_US': defaultRouteConfig,
        '/static/scripts/commonPasswordsList.json': defaultRouteConfig,
    },
    {
        '/static': {
            target: 'https://localhost:4200',
            changeOrigin: true,
            secure: false,
            bypass: function (req, res, proxyOptions) {
                if (req.url.includes('/static/lang_en_US')) {
                    return req.url.replace('/static/lang_en_US', '');
                }
                return req.url.replace('/static', '');
            },
        },
    },
];

module.exports = PROXY_CONFIG;
