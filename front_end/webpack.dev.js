const fs = require( 'fs' );
const webpack = require( 'webpack' );
const merge = require( 'webpack-merge' );
const CopyWebpackPlugin = require( 'copy-webpack-plugin' );
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const common = require( './webpack.common.js' );
const ExtractTextPlugin = require( 'extract-text-webpack-plugin' );

const ENV = process.env.ENV = process.env.NODE_ENV = 'dev';
const host = '0.0.0.0';
const port = 9000;
const cloudInstance =  process.env.CLOUD_INSTANCE || 'https://dev2.cloud.hdw.mx';
const localStatic = `https://${host}:${port}`;

module.exports = merge( common, {
    devtool  : 'cheap-module-eval-source-map',
    devServer: {
        stats             : {
            warningsFilter: /System.import/ // https://github.com//issues/21560
        },
        disableHostCheck  : true,
        contentBase       : './dist',
        hot               : true,
        host              : host,
        port              : port,
        proxy             : [
            // Uncomment to test local translation strings
            {
                context     : ['/api/utils/language'],
                target      : localStatic,
                pathRewrite : { '^/api/utils/language': 'language_compiled.json' },
                changeOrigin: true,
                secure      : false
            },
            {
                context     : ['/api/', '/gateway/', '/admin/'],
                target      : cloudInstance,
                changeOrigin: true,
                secure      : false

            },
            {
                context     : '/static/lang_en_US/views',
                target      : localStatic,
                pathRewrite : { '^/static/lang_en_US/views': '/views' },
                changeOrigin: true,
                secure      : false
            },
            {
                context     : '/static/lang_en_US/web_common/views',
                target      : localStatic,
                pathRewrite : { '^/static/lang_en_US/web_common/views': '/web_common/views' },
                changeOrigin: true,
                secure      : false
            },
            {
                context     : '/static/images/',
                target      : localStatic,
                pathRewrite : { '^/static/images': '/images' },
                changeOrigin: true,
                secure      : false
            },
            {
                context     : '/static/lang_en_GB/',
                target      : cloudInstance,
                changeOrigin: true,
                secure      : false
            },
            {
                context     : '/static/lang_ru_RU/',
                target      : cloudInstance,
                changeOrigin: true,
                secure      : false
            },
            {
                context     : '/static/lang_de_DE/',
                target      : cloudInstance,
                changeOrigin: true,
                secure      : false
            },
            {
                context     : '/static/lang_he_IL/',
                target      : cloudInstance,
                changeOrigin: true,
                secure      : false
            },
            {
                context     : '/static/lang_pt_BR/',
                target      : cloudInstance,
                changeOrigin: true,
                secure      : false
            },
            {
                context     : '/static/',
                target      : localStatic,
                pathRewrite : { '^/static': '' },
                changeOrigin: true,
                secure      : false
            },
            // Use firebase service worker locally
            {
                context     : ['/firebase-messaging-sw.js'],
                target      : localStatic,
                pathRewrite : { '^/firebase-messaging-sw.js': 'scripts/vendor/firebase-messaging-sw.js' },
                changeOrigin: true,
                secure      : false
            },
        ],
        https             : {
            spdy: {
                protocols: ['http/1.1']
            },
            key : fs.readFileSync( 'ssl_keys/server.key' ).toString(),
            cert: fs.readFileSync( 'ssl_keys/server.crt' ).toString()
        },
        historyApiFallback: {
            index: '/'
        }
    },
    plugins  : [
        new webpack.HotModuleReplacementPlugin(),
        // new BundleAnalyzerPlugin({analyzerHost:'0.0.0.0', analyzerPort:9001})

        // make some resources available while serve the project locally
        new CopyWebpackPlugin( [
            // *****************************************
            // Local test for commonPasswordsList ******
            {
                from: 'scripts/commonPasswordsList.json',
                to  : 'static/scripts/commonPasswordsList.json'
            }
            // *****************************************
        ] )
    ],
    output   : {
        filename  : 'scripts/[name].js',
        publicPath: '/'
    },
    module   : {
        rules: [
            {
                test   : /\.scss$/,
                include: /src/,
                loaders: ['raw-loader', 'sass-loader']
            },
            {
                test   : /\.s?css$/,
                exclude: /src/,
                use    : ExtractTextPlugin.extract( {
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
                } )
            }
        ]
    }
} );
