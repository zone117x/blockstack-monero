"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const HostedMoneroAPIClient_Base_1 = __importDefault(require("../libs/mymonero-app-js/local_modules/HostedMoneroAPIClient/HostedMoneroAPIClient_Base"));
const BackgroundResponseParser_web_1 = __importDefault(require("../libs/mymonero-app-js/local_modules/HostedMoneroAPIClient/BackgroundResponseParser.web"));
const mymonero_core = __importStar(require("../libs/mymonero-app-js/local_modules/mymonero_core_js/index"));
const request_1 = __importDefault(require("request"));
const bignumber_js_1 = require("bignumber.js");
/**
 * Caches the asynchronous loaded monero_utils object.
 *
 * @remarks
 * The monero_utils import is a promise but has synchronous methods
 * that we want to use without forcing whole call chains into async/awaits.
 */
class MoneroUtilLoader {
    static get util() {
        if (!this._util) {
            throw new Error("MoneroUtilLoader has not been loaded.");
        }
        return this._util;
    }
    static load() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._util) {
                this._util = yield mymonero_core.monero_utils_promise;
            }
        });
    }
}
exports.MoneroUtilLoader = MoneroUtilLoader;
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
class MoneroWallet {
    get addressKeys() {
        return this._addressKeys;
    }
    constructor(walletData) {
        this._addressKeys = walletData;
        // Define options required by the MyMonero API client.
        let apiClientOptions = {
            appUserAgent_product: 'blockstack-monero',
            appUserAgent_version: '0.0.1',
            request_conformant_module: request_1.default
        };
        // Define the context object with the response parser required by the client.
        let apiClientContext = {
            backgroundAPIResponseParser: new BackgroundResponseParser_web_1.default()
        };
        // Instantiate an instance of the MyMonero API client.
        this._apiClient = new HostedMoneroAPIClient_Base_1.default(apiClientOptions, apiClientContext);
    }
    /** Gets the network type value expected by monero_utils. */
    static getNetworkID(testnet) {
        if (testnet) {
            return mymonero_core.nettype_utils.network_type.TESTNET;
        }
        else {
            return mymonero_core.nettype_utils.network_type.MAINNET;
        }
    }
    /** Generates a new set of account keys. */
    static createNewAddress(localeLanguageCode = "en-US", testnet = false) {
        const networkType = this.getNetworkID(testnet);
        let keys = MoneroUtilLoader.util.newly_created_wallet(localeLanguageCode, networkType);
        let result = {
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
    }
    static createAddressKeysFromMnemonic(mnemonic, wordSetLanguage = "English", testnet = false) {
        const networkType = this.getNetworkID(testnet);
        // Create keys from mnemonic
        const keys = MoneroUtilLoader.util.seed_and_keys_from_mnemonic(mnemonic, networkType);
        let result = {
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
    }
    static createAddressKeysFromPrivateKey(privateKey, wordSetLanguage = "English", testnet = false) {
        // First create a mnemonic from the given private key.
        const mnemonic = MoneroUtilLoader.util.mnemonic_from_seed(privateKey, wordSetLanguage);
        // Now create the keys from the mnemonic.
        return this.createAddressKeysFromMnemonic(mnemonic, wordSetLanguage, testnet);
    }
    /**
     * Registers a newly created account. Must be called after locally generating account keys
     * so that the MyMonero service tracks the account transactions.
     */
    registerNewAccount() {
        // Wrap the client callback oriented function in a Promise.
        return new Promise((resolve, reject) => {
            try {
                let isNewlyGeneratedAccount = true;
                this._apiClient.LogIn(this._addressKeys.publicAddress, this._addressKeys.privateKeys.view, isNewlyGeneratedAccount, (err, newAddress, receivedGeneratedLocally, startHeight) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({ alreadyRegistered: !newAddress });
                });
            }
            catch (err) {
                // Internal error.
                reject(err);
            }
        });
    }
    getBalanceInfo() {
        // Wrap the client callback oriented function in a Promise.
        return new Promise((resolve, reject) => {
            try {
                this._apiClient.AddressInfo_returningRequestHandle(this._addressKeys.publicAddress, this._addressKeys.privateKeys.view, this._addressKeys.publicKeys.spend, this._addressKeys.privateKeys.spend, (err, ...result) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    // The MyMonero API client returns all this data in the form of callback args, oh my.
                    // Whip this argument list into a manageable object.
                    let info = {
                        // These amount values are an integer (piconero / smallest units), convert to human readable string.
                        totalReceived: mymonero_core.monero_amount_format_utils.formatMoney(result[0]),
                        lockedBalance: mymonero_core.monero_amount_format_utils.formatMoney(result[1]),
                        totalSent: mymonero_core.monero_amount_format_utils.formatMoney(result[2]),
                        balance: mymonero_core.monero_amount_format_utils.formatMoney(result[0].subtract(result[2])),
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
    }
    getTransactions() {
        // Wrap the client callback oriented function in a Promise.
        return new Promise((resolve, reject) => {
            try {
                this._apiClient.AddressTransactions_returningRequestHandle(this._addressKeys.publicAddress, this._addressKeys.privateKeys.view, this._addressKeys.publicKeys.spend, this._addressKeys.privateKeys.spend, (err, ...result) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    // Convert some properties on the transaction objects to be more useful for us.
                    let resultTxs = result[5];
                    let txs = resultTxs.map(tx => ({
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
                    }));
                    // Turn these unruly callback function args into an object. 
                    let txResult = {
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
    }
    sendFunds(toAddress, amount, testnet = false) {
        // Wrap the client callback oriented function in a Promise.
        return new Promise((resolve, reject) => {
            try {
                // Convert the BigNumber to a string.
                let amountString = amount.toString();
                const networkType = MoneroWallet.getNetworkID(testnet);
                // Some hardcoded options (that not specifiable in GUI yet..)
                const txPriority = 1; // normal priority
                const paymentId = null;
                const isSweep = false;
                // Initiate the transaction.
                mymonero_core.monero_sendingFunds_utils.SendFunds(toAddress, networkType, amountString, isSweep, this._addressKeys.publicAddress, this._addressKeys.privateKeys, this._addressKeys.publicKeys, this._apiClient, paymentId, txPriority, code => {
                    // Intermediate status callback..
                    console.log("Send funds step " + code + ": " + mymonero_core.monero_sendingFunds_utils.SendFunds_ProcessStep_MessageSuffix[code]);
                }, (...result) => {
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
                }, err => {
                    // Transaction problem callback..
                    reject(err);
                });
            }
            catch (err) {
                // Internal error.
                reject(err);
            }
        });
    }
}
exports.MoneroWallet = MoneroWallet;
//# sourceMappingURL=moneroWallet.js.map