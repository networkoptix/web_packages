const { rewriteLegacy, target, targetInstanceUrl } = require('./proxy-helper');

const rewritePaths = {
    // '/api/cms': '/api',
    '/api/notifications': '/api',
};

const websocketRewrite = {
    '^/system_groups': '',
};

const PROXY_CONFIG = [
    {
        context: [
            '/api',
            '/oauth',
            '/cs',
            '/cdb',
            '/docdb',
            '/partners',
            // authorize iframe
            '/authorize',
            '/static/authorization',
            // mediaserver specific apis
            '/ec2',
            '/hls',
            '/proxy',
            '/rest',
            '/web',
            // django admin proxies
            '/admin',
            '/static/admin',
            '/static/media',
            '/static/admin_tools',
            '/static/bootstrap',
            '/static/css/main.css',
            // static content from cloud
            '/static/languages.json',
            '/static/images/logo.png',
            '/static/images/dark_logo.png',
            '/static/images/promo',
            '/static/lang_en_US/views/static/landing.html',
            '/static/version.txt',
            '/static/503.html',
            '/static/customization',
            '/static/lang_ru_RU',
            '/static/lang_ja_JP',
            '/static/lang_ge_DE',
            '/swagger-ui',
        ],
        target: targetInstanceUrl,
        changeOrigin: true,
        secure: false,
        pathRewrite: rewriteLegacy ? rewritePaths : {},
        bypass: function (req, res, proxyOptions) {
            req.headers.origin = targetInstanceUrl;
        },
    },
    {
        context: ['/static/lang_en_US', '/static'],
        target: 'https://localhost:9000',
        changeOrigin: true,
        secure: false,
        bypass: function (req, res, proxyOptions) {
            if (req.url.includes('/static/lang_en_US')) {
                return req.url.replace('/static/lang_en_US', '');
            }

            return req.url.replace(/static\/\d{5}/, 'static').replace('/static', '');
        },
    },
    {
        context: ['/system_groups'],
        target: targetInstanceUrl,
        changeOrigin: true,
        secure: false,
        ws: true,
        pathRewrite: target === 'local' ? websocketRewrite : {},
    },
];

module.exports = PROXY_CONFIG;
