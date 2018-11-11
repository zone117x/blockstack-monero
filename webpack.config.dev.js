const merge = require('webpack-merge');
const baseConfig = require('./webpack.config.js');
const path = require('path');

module.exports = merge(baseConfig, {
    mode: 'development',
    devtool: "inline-source-map",
    devServer: {
        contentBase: path.join(__dirname, 'app'),
        index: 'index.html',
        watchContentBase: true
    },
    optimization: {},
    plugins: [

    ],
});