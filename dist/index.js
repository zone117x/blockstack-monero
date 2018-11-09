"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var HostedMoneroAPIClient_Lite_1 = __importDefault(require("../libs/mymonero-app-js/local_modules/HostedMoneroAPIClient/HostedMoneroAPIClient.Lite"));
var BackgroundResponseParser_web_1 = __importDefault(require("../libs/mymonero-app-js/local_modules/HostedMoneroAPIClient/BackgroundResponseParser.web"));
var mymonero_core_js_1 = require("../libs/mymonero-app-js/local_modules/mymonero_core_js");
var request_1 = __importDefault(require("request"));
var bignumber_js_1 = require("bignumber.js");
var moment_1 = __importDefault(require("moment"));
var MoneroWallet = /** @class */ (function () {
    function MoneroWallet(walletData) {
        this._walletData = walletData;
        // Define options required by the MyMonero API client.
        var apiClientOptions = {
            appUserAgent_product: 'blockstack-monero',
            appUserAgent_version: '0.0.1',
            request_conformant_module: request_1.default
        };
        // Define the context object with the response parser required by the client.
        var apiClientContext = {
            backgroundAPIResponseParser: new BackgroundResponseParser_web_1.default()
        };
        // Instantiate an instance of the MyMonero API client.
        this._apiClient = new HostedMoneroAPIClient_Lite_1.default(apiClientOptions, apiClientContext);
    }
    MoneroWallet.prototype.getWalletInfo = function () {
        var _this = this;
        // Wrap the client callback oriented function in a Promise.
        return new Promise(function (resolve, reject) {
            try {
                _this._apiClient.AddressInfo_returningRequestHandle(_this._walletData.publicAddress, _this._walletData.privateKeys.view, _this._walletData.publicKeys.spend, _this._walletData.privateKeys.spend, function (err) {
                    var result = [];
                    for (var _i = 1; _i < arguments.length; _i++) {
                        result[_i - 1] = arguments[_i];
                    }
                    if (err) {
                        reject(err);
                    }
                    // The MyMonero API client returns all this data in the form of callback args, oh my.
                    // Whip this argument list into a manageable object.
                    var info = {
                        // These amount values are in piconero, convert to human readable amount.
                        totalReceived: mymonero_core_js_1.monero_amount_format_utils.formatMoney(result[0]),
                        lockedBalance: mymonero_core_js_1.monero_amount_format_utils.formatMoney(result[1]),
                        totalSent: mymonero_core_js_1.monero_amount_format_utils.formatMoney(result[2]),
                        spentOutputs: result[3],
                        accountScannedTxHeight: result[4],
                        accountScannedBlockHeight: result[5],
                        accountScanStartHeight: result[6],
                        transactionHeight: result[7],
                        blockchainHeight: result[8],
                        ratesBySymbol: result[9]
                    };
                    resolve(info);
                });
            }
            catch (err) {
                // Internal error.
                reject(err);
            }
        });
    };
    MoneroWallet.prototype.getTransactions = function () {
        var _this = this;
        // Wrap the client callback oriented function in a Promise.
        return new Promise(function (resolve, reject) {
            try {
                _this._apiClient.AddressTransactions_returningRequestHandle(_this._walletData.publicAddress, _this._walletData.privateKeys.view, _this._walletData.publicKeys.spend, _this._walletData.privateKeys.spend, function (err, accountScannedHeight, accountScannedBlockHeight, accountScanStartHeight, transactionHeight, blockchainHeight, transactions) {
                    if (err) {
                        reject(err);
                    }
                    var ff = transactions[0].timestamp instanceof Date;
                    var txs = transactions.map(function (tx) { return ({
                        amount: new bignumber_js_1.BigNumber(tx.amount.toString()),
                        totalReceived: new bignumber_js_1.BigNumber(tx.total_received.toString()),
                        totalSent: new bignumber_js_1.BigNumber(tx.total_sent.toString()),
                        coinbase: tx.coinbase,
                        hash: tx.hash,
                        height: tx.height,
                        id: tx.id,
                        mempool: tx.mempool,
                        mixin: tx.mixin,
                        timestamp: moment_1.default(tx.timestamp).toDate(),
                        unlockTime: tx.unlock_time
                    }); });
                    // Turn these unruly function args into an object. 
                    var result = {
                        accountScannedTxHeight: accountScannedHeight,
                        accountScannedBlockHeight: accountScannedBlockHeight,
                        accountScanStartHeight: accountScanStartHeight,
                        transactionHeight: transactionHeight,
                        blockchainHeight: blockchainHeight,
                        transactions: txs
                    };
                    resolve(result);
                });
            }
            catch (err) {
                // Internal error.
                reject(err);
            }
        });
    };
    MoneroWallet.prototype.sendFunds = function (toAddress, amount) {
        var _this = this;
        // Wrap the client callback oriented function in a Promise.
        return new Promise(function (resolve, reject) {
            try {
                // Convert the BigNumber to a string.
                var amountString = amount.toString();
                // Some hardcoded options (that not specifiable in GUI yet..)
                var txPriority = 1;
                var paymentId = null;
                var isSweep = false;
                var networkType = mymonero_core_js_1.nettype_utils.network_type.MAINNET;
                mymonero_core_js_1.monero_sendingFunds_utils.SendFunds(toAddress, networkType, amountString, isSweep, _this._walletData.publicAddress, _this._walletData.privateKeys, _this._walletData.publicKeys, _this._apiClient, paymentId, txPriority, function (code) {
                    // Intermediate status callback..
                    console.log("Send funds step " + code + ": " + mymonero_core_js_1.monero_sendingFunds_utils.SendFunds_ProcessStep_MessageSuffix[code]);
                }, function (toAddr, sentAmount, finalPaymentId, txHash, txFee, txKey, mixin) {
                    // Transaction successful callback..
                    resolve({
                        toAddress: toAddr,
                        sentAmount: sentAmount,
                        paymentId: finalPaymentId,
                        txHash: txHash,
                        txFee: txFee,
                        txKey: txKey,
                        mixin: mixin
                    });
                }, function (err) {
                    // Transaction problem callback..
                    reject(err);
                });
            }
            catch (err) {
                // Internal error.
                reject(err);
            }
        });
    };
    return MoneroWallet;
}());
var toAddress = "42pVXU53GnA24zoiBpvcwsGEcnXvjdAG2aScfMW7Kkck9ftGfpb9pwRXUQAas2e8jKHYKvXaZNosGYAqwJYwhbCu7KjkYxo";
var wallet = {
    publicAddress: "43zxvpcj5Xv9SEkNXbMCG7LPQStHMpFCQCmkmR4u5nzjWwq5Xkv5VmGgYEsHXg4ja2FGRD5wMWbBVMijDTqmmVqm93wHGkg",
    privateKeys: {
        view: "7bea1907940afdd480eff7c4bcadb478a0fbb626df9e3ed74ae801e18f53e104",
        spend: "4e6d43cd03812b803c6f3206689f5fcc910005fc7e91d50d79b0776dbefcd803"
    },
    publicKeys: {
        view: "080a6e9b17de47ec62c8a1efe0640b554a2cde7204b9b07bdf9bd225eeeb1c47",
        spend: "3eb884d3440d71326e27cc07a861b873e72abd339feb654660c36a008a0028b3"
    }
};
// TODO: find how to get a user friendly list of tx history.
// use hostedMoneroAPIClient.AddressTransactions_returningRequestHandle
// TODO: find the utility to convert raw private key bytes from blockstack to a monero seed.
var moneroWallet = new MoneroWallet(wallet);
function tests() {
    return __awaiter(this, void 0, void 0, function () {
        var txs, walletInfo;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, moneroWallet.getTransactions()];
                case 1:
                    txs = _a.sent();
                    return [4 /*yield*/, moneroWallet.getWalletInfo()];
                case 2:
                    walletInfo = _a.sent();
                    console.log(walletInfo);
                    return [4 /*yield*/, moneroWallet.sendFunds(toAddress, new bignumber_js_1.BigNumber("0.0001"))];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
tests().then(function (result) {
    console.log(result);
})
    .catch(function (err) {
    console.log(err);
});
//# sourceMappingURL=index.js.map