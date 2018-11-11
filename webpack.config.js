const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const outputDir = "app";

module.exports = {
    entry: './dist/main.js',
    mode: 'production',
    devtool: "source-map",
    optimization: {
        usedExports: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: [/node_modules/],
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            cacheDirectory: false
                        }
                    }
                ]
            },
            {
                test: [
                    // Ignore an used async.js import which bloats the bundle quite a bit.
                    /async\.js$/,

                    // Ignore the 'window' DOM polyfill for node runtime.
                    path.resolve(__dirname, 'node_modules/window/src/index.js')
                ],
                use: 'null-loader'
            },
            {
                // Fix a hard coded resource path monero-app-js. 
                test: /MyMoneroCoreBridge\.js$/,
                loader: 'string-replace-loader',
                options: {
                    search: '/mymonero_core_js/monero_utils/',
                    replace: '/',
                }
            }
        ]
    },
    resolve: {
        alias: {
            "fs": "html5-fs",
            "request$": "xhr"
        }
    },
    output: {
        path: path.resolve(__dirname, outputDir),
        filename: 'app.bundle.js'
    },
    node: {
        //http: false,
        child_process: false
    },
    plugins: [

        // Ignore some modules used only during runtime in Node.
        new webpack.IgnorePlugin(/child_process/),
        new webpack.IgnorePlugin(/electron/),
        new webpack.IgnorePlugin(/node-localstorage/),

        // Ignore moment.js locales warning.
        new webpack.IgnorePlugin(/^\.\/locale$/, /cryptonote_utils$/),

        // Do not bundle in the ASM.js version of MoneroCore (we are okay with only WASM).
        new webpack.IgnorePlugin(/MyMoneroCoreCpp_ASMJS/),

        // Fix a wasm.js import path - newer versions of webpack or babel are resolving
        // extensionless imports like 'libWASM' to 'libWASM.wasm' rather than 'libWASM.js'.
        new webpack.NormalModuleReplacementPlugin(/^\.\/MyMoneroCoreCpp_WASM$/, './MyMoneroCoreCpp_WASM.js'),

        // Copy the MoneroCore wasm binary file to our output directory.
        new CopyWebpackPlugin([
            {
                from: '**/monero_utils/MyMoneroCoreCpp_WASM.wasm',
                to: path.resolve(__dirname, outputDir) + '/' + '[name].[ext]',
                toType: 'template'
            }
        ])
    ]
};