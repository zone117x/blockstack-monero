const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: './dist/index.js',
    mode: 'development',
    devtool: "source-map",
    optimization: {
        usedExports: true
    },
    module: {
        rules: [
            {
                test: /\.wasm$/,
                loader: "file-loader",
                type: "javascript/auto",
            },
            {
                test: /async\.js$/,
                use: 'null-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.wasm', '.js'],
        alias: {
            "fs": "html5-fs",
            "request$": "xhr"
        }
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    node: {
      //fs: 'empty',
      //net: 'empty',
      //tls: 'empty'
    },
    plugins: [
        new webpack.IgnorePlugin(/electron/),
        new webpack.IgnorePlugin(/^\.\/locale$/, /cryptonote_utils$/),
        new webpack.IgnorePlugin(/MyMoneroCoreCpp_ASMJS/)
    ],
    externals: [
        /*(function () {
            var IGNORES = [
                'electron'
            ];
            return function (context, request, callback) {
                if (IGNORES.indexOf(request) >= 0) {
                    return callback(null, "require('" + request + "')");
                }
                return callback();
            };
        })()*/
    ]
};