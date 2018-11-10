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
var DEBUG = true;
/**
 * Caches the asynchronous loaded monero_utils object.
 *
 * @remarks
 * The monero_utils import is a promise but has synchronous methods
 * that we want to use without forcing whole call chains into async/awaits.
 */
var MoneroUtilLoader = /** @class */ (function () {
    function MoneroUtilLoader() {
    }
    Object.defineProperty(MoneroUtilLoader, "util", {
        get: function () {
            if (!this._util) {
                throw new Error("MoneroUtilLoader has not been loaded.");
            }
            return this._util;
        },
        enumerable: true,
        configurable: true
    });
    MoneroUtilLoader.load = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!this._util) return [3 /*break*/, 2];
                        _a = this;
                        return [4 /*yield*/, mymonero_core_js_1.monero_utils_promise];
                    case 1:
                        _a._util = _b.sent();
                        _b.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return MoneroUtilLoader;
}());
/**
 * A promise-based class for interacting with the MyMonero API.
 *
 * @remarks
 * Uses helper methods from the mymonero web app which does all
 * the client-side heavy lifting required for constructing
 * transactions from possible-unspent outputs and key image processing
 * for determining the account's transaction history.
 *
 */
var MoneroWallet = /** @class */ (function () {
    function MoneroWallet(walletData) {
        this._addressKeys = walletData;
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
    Object.defineProperty(MoneroWallet.prototype, "addressKeys", {
        get: function () {
            return this._addressKeys;
        },
        enumerable: true,
        configurable: true
    });
    /** Gets the network type value expected by monero_utils. */
    MoneroWallet.getNetworkID = function (testnet) {
        if (testnet) {
            return mymonero_core_js_1.nettype_utils.network_type.TESTNET;
        }
        else {
            return mymonero_core_js_1.nettype_utils.network_type.MAINNET;
        }
    };
    /** Generates a new set of account keys. */
    MoneroWallet.createNewAddress = function (localeLanguageCode, testnet) {
        if (localeLanguageCode === void 0) { localeLanguageCode = "en-US"; }
        if (testnet === void 0) { testnet = false; }
        var networkType = this.getNetworkID(testnet);
        var keys = MoneroUtilLoader.util.newly_created_wallet(localeLanguageCode, networkType);
        var result = {
            mnemonic: keys.mnemonic_string,
            mnemonicLanguage: keys.mnemonic_language,
            publicAddress: keys.address_string,
            privateKeys: {
                spend: keys.sec_spendKey_string,
                view: keys.sec_viewKey_string,
            },
            publicKeys: {
                spend: keys.pub_spendKey_string,
                view: keys.pub_viewKey_string
            }
        };
        return result;
    };
    MoneroWallet.createAddressKeysFromMnemonic = function (mnemonic, wordSetLanguage, testnet) {
        if (wordSetLanguage === void 0) { wordSetLanguage = "English"; }
        if (testnet === void 0) { testnet = false; }
        var networkType = this.getNetworkID(testnet);
        // Create keys from mnemonic
        var keys = MoneroUtilLoader.util.seed_and_keys_from_mnemonic(mnemonic, networkType);
        var result = {
            mnemonic: mnemonic,
            mnemonicLanguage: keys.mnemonic_language,
            publicAddress: keys.address_string,
            privateKeys: {
                spend: keys.sec_spendKey_string,
                view: keys.sec_viewKey_string,
            },
            publicKeys: {
                spend: keys.pub_spendKey_string,
                view: keys.pub_viewKey_string
            }
        };
        return result;
    };
    MoneroWallet.createAddressKeysFromPrivateKey = function (privateKey, wordSetLanguage, testnet) {
        if (wordSetLanguage === void 0) { wordSetLanguage = "English"; }
        if (testnet === void 0) { testnet = false; }
        // Create mnemonic from the given private key.
        var mnemonic = MoneroUtilLoader.util.mnemonic_from_seed(privateKey, wordSetLanguage);
        return this.createAddressKeysFromMnemonic(mnemonic, wordSetLanguage, testnet);
    };
    MoneroWallet.prototype.getBalanceInfo = function () {
        var _this = this;
        // Wrap the client callback oriented function in a Promise.
        return new Promise(function (resolve, reject) {
            try {
                _this._apiClient.AddressInfo_returningRequestHandle(_this._addressKeys.publicAddress, _this._addressKeys.privateKeys.view, _this._addressKeys.publicKeys.spend, _this._addressKeys.privateKeys.spend, function (err) {
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
                        // These amount values are in integer (small units / piconero), convert to human readable string.
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
                _this._apiClient.AddressTransactions_returningRequestHandle(_this._addressKeys.publicAddress, _this._addressKeys.privateKeys.view, _this._addressKeys.publicKeys.spend, _this._addressKeys.privateKeys.spend, function (err) {
                    var result = [];
                    for (var _i = 1; _i < arguments.length; _i++) {
                        result[_i - 1] = arguments[_i];
                    }
                    if (err) {
                        reject(err);
                    }
                    // Convert some properties on the transaction objects to be more useful for us.
                    var resultTxs = result[5];
                    var txs = resultTxs.map(function (tx) { return ({
                        amount: new bignumber_js_1.BigNumber(tx.amount.toString()),
                        totalReceived: new bignumber_js_1.BigNumber(tx.total_received.toString()),
                        totalSent: new bignumber_js_1.BigNumber(tx.total_sent.toString()),
                        coinbase: tx.coinbase,
                        hash: tx.hash,
                        height: tx.height,
                        id: tx.id,
                        mempool: tx.mempool,
                        mixin: tx.mixin,
                        timestamp: tx.timestamp,
                        unlockTime: tx.unlock_time
                    }); });
                    // Turn these unruly callback function args into an object. 
                    var txResult = {
                        accountScannedTxHeight: result[0],
                        accountScannedBlockHeight: result[1],
                        accountScanStartHeight: result[2],
                        transactionHeight: result[3],
                        blockchainHeight: result[4],
                        transactions: txs
                    };
                    resolve(txResult);
                });
            }
            catch (err) {
                // Internal error.
                reject(err);
            }
        });
    };
    MoneroWallet.prototype.sendFunds = function (toAddress, amount, testnet) {
        var _this = this;
        if (testnet === void 0) { testnet = false; }
        // Wrap the client callback oriented function in a Promise.
        return new Promise(function (resolve, reject) {
            try {
                // Convert the BigNumber to a string.
                var amountString = amount.toString();
                var networkType = MoneroWallet.getNetworkID(testnet);
                // Some hardcoded options (that not specifiable in GUI yet..)
                var txPriority = 1;
                var paymentId = null;
                var isSweep = false;
                mymonero_core_js_1.monero_sendingFunds_utils.SendFunds(toAddress, networkType, amountString, isSweep, _this._addressKeys.publicAddress, _this._addressKeys.privateKeys, _this._addressKeys.publicKeys, _this._apiClient, paymentId, txPriority, function (code) {
                    // Intermediate status callback..
                    console.log("Send funds step " + code + ": " + mymonero_core_js_1.monero_sendingFunds_utils.SendFunds_ProcessStep_MessageSuffix[code]);
                }, function () {
                    var result = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        result[_i] = arguments[_i];
                    }
                    // Transaction successful callback..
                    resolve({
                        toAddress: result[0],
                        sentAmount: result[1],
                        paymentId: result[2],
                        txHash: result[3],
                        txFee: result[4],
                        txKey: result[5],
                        mixin: result[6]
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
function tests() {
    return __awaiter(this, void 0, void 0, function () {
        var keys, moneroWallet, txs, walletInfo, toAddress, sendResult;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, MoneroUtilLoader.load()];
                case 1:
                    _a.sent();
                    keys = MoneroWallet.createAddressKeysFromMnemonic("input betting five balding update licks hive february dogs peaches ongoing digit five");
                    moneroWallet = new MoneroWallet(keys);
                    return [4 /*yield*/, moneroWallet.getTransactions()];
                case 2:
                    txs = _a.sent();
                    console.log(txs);
                    return [4 /*yield*/, moneroWallet.getBalanceInfo()];
                case 3:
                    walletInfo = _a.sent();
                    console.log(walletInfo);
                    toAddress = "43Pzz5GFHzG4VSvoR1zievZmQ3ABZppFagWsQkdpLwV2JMmu2LLU5GgHmSbVqc7dBMAYi49BHXD3cTLWX3D4LX8k4q1AXQf";
                    return [4 /*yield*/, moneroWallet.sendFunds(toAddress, new bignumber_js_1.BigNumber("0.00001"))];
                case 4:
                    sendResult = _a.sent();
                    console.log(sendResult);
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