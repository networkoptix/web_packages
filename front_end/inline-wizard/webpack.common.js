const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
    context: path.resolve(__dirname + '/app'),
    entry:{
        inline: 'scripts/entrypoint.js',
    },
    plugins: [
        //Development plugins
        new CleanWebpackPlugin(['dist']),

        //Plugins used for making templates
        new webpack.NamedModulesPlugin(),
        new HtmlWebpackPlugin({
            chunks: ['commons', 'webInline', 'inline'],
            chunksSortMode: 'manual',
            template: 'index.html',
            filename: 'index.html',
            inject:false
        }),
        new ExtractTextPlugin({filename: 'styles/[name].css'}),
        new CopyWebpackPlugin([
            {
                from: '',
                to: '',
                ignore: ['styles/**', '.*', '*.js', '*-template.html']
            },
            {
                from:'../node_modules/bootstrap-sass/assets/fonts',
                to: 'fonts'
            }
        ]),

        //Plugins for npm packages
        new webpack.ProvidePlugin({
            'md5': 'md5',
            '$': 'jquery',
            'jQuery': 'jquery',
            'window.jQuery': 'jquery',
            'QWebChannel': 'qwebchannel',
            '_': 'underscore',
            'Base64': 'base-64',
        }),
        new webpack.optimize.CommonsChunkPlugin({
            name: "commons",
            filename: "scripts/commons.js",
            minChunks: 2
        })
    ],
    output: {
        filename: 'scripts/[name].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: ''
    },
    resolve:{
        alias:{
            fonts: path.join(__dirname, 'app', 'fonts'),
            scripts: path.join(__dirname, 'app', 'scripts')
        }
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            }
        ],
        rules: [
            {
                test: /\.(scss|css)$/,
                use: ExtractTextPlugin.extract({
                    use: [{
                        loader: "css-loader",
                        options:{
                            url: false
                        }
                    },
                    {
                        loader: "sass-loader",
                        options:{
                            url: false
                        }
                    }]
                })
            },
        ]
    }
};
