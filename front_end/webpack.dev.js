const fs = require('fs');
// const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const CopyWebpackPlugin = require('copy-webpack-plugin');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const common = require('./webpack.common.js');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const ENV = process.env.ENV = process.env.NODE_ENV = 'dev';
const host = '0.0.0.0';
const port = 9000;
const cloudInstance = process.env.CLOUD_INSTANCE || 'https://cloud-dev2.hdw.mx';
const localStatic = `https://${host}:${port}`;

module.exports = merge(common, {
    devtool  : 'cheap-module-eval-source-map',
    devServer: {
        contentBase       : './dist',
        hot               : true,
        host              : host,
        port              : port,
        proxy             : [
            {
                context: ['/api/utils/language'],
                target: localStatic,
                pathRewrite: { '^/api/utils/language': 'language_compiled.json'},
                changeOrigin: true,
                secure: false
            },
            {
                context: [ '/api/', '/gateway/' ],
                target : cloudInstance,
                changeOrigin: true,
                //secure: false

            },
            // Rewrite English translations and static pages to be served from DEV files
            {
                context     : '/static/lang_en_US/',
                target      : localStatic,
                pathRewrite : { '^/static/lang_en_US': '' },
                changeOrigin: true,
                secure      : false
            },
            // Rewrite Russian translations and static pages to be served from DEV files
            {
                context: '/static/lang_ru_RU/',
                target: localStatic,
                pathRewrite: {'^/static/lang_ru_RU': ''},
                changeOrigin: true,
                secure: false
            },
            {
                context     : '/static/',
                target      : localStatic,
                pathRewrite : { '^/static': '' },
                changeOrigin: true,
                secure      : false
            },
        ],
        https             : {
            spdy: {
                protocols: ['http/1.1']
            },
            key : fs.readFileSync('ssl_keys/server.key').toString(),
            cert: fs.readFileSync('ssl_keys/server.crt').toString()
        },
        historyApiFallback: {
            index: '/'
        }
    },
    plugins  : [
        new webpack.HotModuleReplacementPlugin(),
        // new BundleAnalyzerPlugin({analyzerHost:'0.0.0.0', analyzerPort:9001})

        // make some resources available while serve the project locally
        new CopyWebpackPlugin([
            {
                from: 'images',
                to  : 'static/images'
            },
            {
                from: 'language_i18n.json',
                to: '../../translations/en_US/language_i18n.json'
            },
            // Local test for i18n *********************
            {
                from: '../../translations/ru_RU/',
                to  : 'static/lang_ru_RU/'
            },
            // *****************************************
            // Local test for commonPasswordsList ******
            {
                from: 'scripts/commonPasswordsList.json',
                to  : 'static/scripts/commonPasswordsList.json'
            }
            // *****************************************
        ])
    ],
    output: {
        filename  : 'scripts/[name].js',
        // path      : path.resolve(__dirname, 'dist'),
        publicPath: '/'
    },
    module   : {
        rules: [
            {
                test   : /\.scss$/,
                include: /src/,
                loaders: [ 'raw-loader', 'sass-loader' ]
            },
            {
                test: /\.s?css$/,
                exclude: /src/,
                use : ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use     : [
                        {
                            loader : 'css-loader',
                            options: {
                                url      : false,
                                sourceMap: true
                            }
                        },
                        {
                            loader : 'postcss-loader',
                            options: {
                                url      : false,
                                sourceMap: 'inline'
                            }
                        },
                        {
                            loader : 'sass-loader',
                            options: {
                                url      : false,
                                sourceMap: true
                            }
                        }
                    ]
                })
            }
        ]
    }
});
