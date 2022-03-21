const fs = require('fs');
const webpack = require('webpack');
const merge = require('webpack-merge');
const CopyWebpackPlugin = require('copy-webpack-plugin');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const server_address = process.env.server_address || 'https://0.0.0.0:7001';
const host = '0.0.0.0';
const port = 9001;
const localStatic = `https://${host}:${port}`;

const common = require('./webpack.common.js');

module.exports = merge(common, {
    devtool: 'inline-source-map',
    devServer: {
        contentBase: './dist',
        hot: true,
        host: host,
        port: port,
        proxy: [
            {
                context: ['/web/', '/api/', '/ec2/', '/hls/', '/media/', '/proxy/', '/rest/'],
                // target: 'https://fb7a19a3-2b0c-4feb-be48-539231e50113.relay.vmsproxy.hdw.mx/',
                target: server_address,
                changeOrigin: true,
                secure: false
            },
            {
                context: '/lang_en_US/',
                target: localStatic,
                pathRewrite: { '^/lang_en_US/': '' },
                changeOrigin: true,
                secure: false
            },
            {
                context: '/static/',
                target: localStatic,
                pathRewrite: { '^/static': '' },
                changeOrigin: true,
                secure: false
            },
            {
                context: '/index.html',
                target: localStatic,
                pathRewrite: { '^/index.html': 'inline.html' },
                changeOrigin: true,
                secure: false
            },
            {
                context: '/',
                target: localStatic,
                pathRewrite: { '^/': 'inline.html' },
                changeOrigin: true,
                secure: false
            }
        ],
        https: {
            spdy: {
                protocols: ['http/1.1']
            },
            key: fs.readFileSync('../ssl_keys/server.key').toString(),
            cert: fs.readFileSync('../ssl_keys/server.crt').toString()
        },
        historyApiFallback: {
            index: '/'
        }
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        // new BundleAnalyzerPlugin({analyzerHost:'0.0.0.0', analyzerPort:9001})

        // make some resources available while serve the project locally
        new CopyWebpackPlugin([
            // Local customizations *********************
            {
                from: '../customization/',
                to: 'customization/'
            }
        ])
    ]
});
