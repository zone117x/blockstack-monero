const merge = require('webpack-merge');
const baseConfig = require('./webpack.config.js');
const path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = merge(baseConfig, {
    mode: 'development',
    devtool: "inline-source-map",
    devServer: {
        contentBase: path.join(__dirname, 'app'),
        index: 'index.html',
        watchContentBase: true,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
          }
    },
    optimization: {
        usedExports: false
    },
    plugins: [
        // new BundleAnalyzerPlugin(),
    ],
});