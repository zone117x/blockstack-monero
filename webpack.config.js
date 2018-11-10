const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
    entry: './dist/index.js',
    mode: 'production',
    devtool: "source-map",
    optimization: {
        usedExports: true
    },
    module: {
        rules: [
            {
                test: /async\.js$/,
                use: 'null-loader'
            },
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
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    plugins: [
        //new BundleAnalyzerPlugin(),
        new webpack.IgnorePlugin(/electron/),
        new webpack.IgnorePlugin(/^\.\/locale$/, /cryptonote_utils$/),
        new webpack.IgnorePlugin(/MyMoneroCoreCpp_ASMJS/),
        new webpack.NormalModuleReplacementPlugin(/^\.\/MyMoneroCoreCpp_WASM$/, './MyMoneroCoreCpp_WASM.js'),
        new CopyWebpackPlugin([
            {
                from: '**/monero_utils/MyMoneroCoreCpp_WASM.wasm',
                to: path.resolve(__dirname, 'dist') + '/' + '[name].[ext]',
                toType: 'template'
            }
        ])
    ],
    externals: [

    ]
};