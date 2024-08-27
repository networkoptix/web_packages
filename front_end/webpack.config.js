const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

/**
 * @type {import('webpack').Configuration}
 */
module.exports = {
    plugins: [
        new webpack.DefinePlugin({
            ngDevMode: false,
        }),
        new CssMinimizerPlugin({ parallel: true }),
        new TerserPlugin({
            extractComments: false,
            exclude: /(nx-webgl|d3)/,
            parallel: true,
            terserOptions: { format: { comments: false } },
        }),
    ],
};
