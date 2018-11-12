import HostedMoneroAPIClient from '../libs/mymonero-app-js/local_modules/HostedMoneroAPIClient/HostedMoneroAPIClient_Base';
import BackgroundResponseParser from '../libs/mymonero-app-js/local_modules/HostedMoneroAPIClient/BackgroundResponseParser.web';
import * as mymonero_core from '../libs/mymonero-app-js/local_modules/mymonero_core_js/index';
import request from 'request';
import { BigInteger} from '../libs/mymonero-app-js/local_modules/mymonero_core_js/cryptonote_utils/biginteger';

// Define the interface for this type - typescript gets confused parsing its javascript export chain.
export const moneyFormatUtils: MoneyFormatUtils = mymonero_core.monero_amount_format_utils!;


/** 
 * A promise-based class for interacting with the MyMonero API.
 * 
 * @remarks
 * Uses helper methods from the mymonero web app which does all the client-side heavy 
 * lifting required for constructing transactions from possible-unspent outputs and key 
 * image processing for determining the account's transaction history.
 */
export class MoneroWallet {
    
    // Cache of the asynchronously loaded monero_utils object.
    static _moneroUtils;

    readonly _apiClient: HostedMoneroAPIClient;
    readonly _addressKeys: AddressKeys;

    get addressKeys() {
        return this._addressKeys;
    }

    constructor(walletData: AddressKeys) {

        this._addressKeys = walletData;

        // Define options required by the MyMonero API client.
        let apiClientOptions = {
            appUserAgent_product: 'blockstack-monero',
            appUserAgent_version: '0.0.1',
            request_conformant_module: request
        };

        // Define the context object with the response parser required by the client.
        let apiClientContext = {
            backgroundAPIResponseParser: new BackgroundResponseParser()
        };

        // Instantiate an instance of the MyMonero API client.
        this._apiClient = new HostedMoneroAPIClient(apiClientOptions, apiClientContext);
    }

    /** Ensures the moneroUtil object has been loaded and if so returns it. */
    static get moneroUtils() {
        if (!this._moneroUtils) {
            throw new Error("MoneroUtilLoader has not been loaded.");
        }
        return this._moneroUtils;
    }

    /** 
     * A one-time initialization which must be called before using the Wallet lib.
     * Performs the MoneroCore wasm binary file loading (the main moneroUtils lib). 
     * 
     * @remarks
     * The monero_utils import is a promise but has synchronous methods
      * that we want to use without forcing whole call chains into async/awaits.
     * 
     * TODO: Can wasm be loaded synchronously like the other js resources to avoid this?
     */
    static async initialize() {
        if (!this._moneroUtils) {
            this._moneroUtils = await mymonero_core.monero_utils_promise;
        }
    }

    /** Gets the network type value expected by monero_utils. */
    static getNetworkID(testnet: boolean) {
        if (testnet) {
            return mymonero_core.nettype_utils.network_type.TESTNET;
        }
        else {
            return mymonero_core.nettype_utils.network_type.MAINNET;
        }
    }

    /** Generates a new set of account keys. */
    static createNewAddress(localeLanguageCode = "en-US", testnet = false): AddressKeys {
        const networkType = this.getNetworkID(testnet);
        let keys = this.moneroUtils.newly_created_wallet(localeLanguageCode, networkType);
        let result: AddressKeys = {
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

    static createAddressKeysFromMnemonic(mnemonic: string, wordSetLanguage = "English", testnet = false): AddressKeys {

        const networkType = this.getNetworkID(testnet);

        // Create keys from mnemonic
        const keys = this.moneroUtils.seed_and_keys_from_mnemonic(mnemonic, networkType);

        let result: AddressKeys = {
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

        // DEBUG: Perform some encoding consistency tests.. 
        const mnemonicTest: string = this.moneroUtils.mnemonic_from_seed(keys.sec_seed_string, wordSetLanguage);
        if (mnemonicTest !== mnemonic){
            throw new Error("Key derivation consistency problem");
        }

        return result;
    }

    /**
     * Creates a Monero key set from a given private key.
     * @param privateKey A 32-byte key (in the form of a 64 char hex string).
     */
    static createAddressKeysFromPrivateKey(privateKey: string, wordSetLanguage = "English", testnet = false): AddressKeys {

        const networkType = this.getNetworkID(testnet);

        // First create a mnemonic from the given private key.
        const mnemonic: string = this.moneroUtils.mnemonic_from_seed(privateKey, wordSetLanguage);

        // Now create the keys with the private key.
        const keys = this.moneroUtils.address_and_keys_from_seed(privateKey, networkType);

        let result: AddressKeys = {
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

        // DEBUG: Perform some encoding consistency tests.. 
        const keysTest = this.createAddressKeysFromMnemonic(mnemonic, wordSetLanguage, testnet);
        if (keysTest.privateKeys.spend !== result.privateKeys.spend) {
            throw new Error("Key derivation consistency error");
        }
        if (keysTest.publicAddress !== result.publicAddress) {
            throw new Error("Address derivation consistency error");
        }

        return result;
    }


    /**
     * Registers a newly created account. Must be called after locally generating account keys
     * so that the MyMonero service tracks the account transactions.
     */
    registerNewAccount() : Promise<{alreadyRegistered: boolean}> {
        // Wrap the client callback oriented function in a Promise.
        return new Promise((resolve, reject) => {
            try {
                let isNewlyGeneratedAccount = true;
                this._apiClient.LogIn(
                    this._addressKeys.publicAddress,
                    this._addressKeys.privateKeys.view,
                    isNewlyGeneratedAccount,
                    (err, newAddress, receivedGeneratedLocally, startHeight) => {
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


    getBalanceInfo(): Promise<BalanceInfoResult> {

        // Wrap the client callback oriented function in a Promise.
        return new Promise((resolve, reject) => {
            try {
                this._apiClient.AddressInfo_returningRequestHandle(
                    this._addressKeys.publicAddress,
                    this._addressKeys.privateKeys.view,
                    this._addressKeys.publicKeys.spend,
                    this._addressKeys.privateKeys.spend,
                    (err, ...result: any[]) => {

                        if (err) {
                            reject(err);
                            return;
                        }

                        const totalReceived : BigInteger = result[0];
                        const lockedBalance : BigInteger = result[1];
                        const totalSent : BigInteger = result[2];
                        const balance : BigInteger = totalReceived.subtract(totalSent);

                        // The MyMonero API client returns all this data in the form of callback args, oh my.
                        // Whip this argument list into a manageable object.
                        let info: BalanceInfoResult = {

                            // These amount values are an integer (piconero / smallest units), convert to human readable string.
                            totalReceived: moneyFormatUtils.formatMoney(totalReceived),
                            lockedBalance: moneyFormatUtils.formatMoney(lockedBalance),
                            totalSent: moneyFormatUtils.formatMoney(totalSent),
                            balance: moneyFormatUtils.formatMoney(balance),

                            balanceEur: '',
                            balanceUsd: '',

                            spentOutputs: result[3],

                            accountScannedTxHeight: result[4],
                            accountScannedBlockHeight: result[5],
                            accountScanStartHeight: result[6],

                            transactionHeight: result[7],
                            blockchainHeight: result[8],

                            ratesBySymbol: result[9]
                        };

                        if (info.ratesBySymbol) {
                            if (info.ratesBySymbol.USD) {
                                info.balanceUsd = moneyFormatUtils.formatMoney(balance.multiply(info.ratesBySymbol.USD))
                            }
                            if (info.ratesBySymbol.EUR) {
                                info.balanceEur = moneyFormatUtils.formatMoney(balance.multiply(info.ratesBySymbol.EUR));
                            }
                        }

                        resolve(info);
                    }
                );
            }
            catch (err) {
                // Internal error.
                reject(err);
            }
        });
    }

    getTransactions(): Promise<TransactionsResult> {

        // Wrap the client callback oriented function in a Promise.
        return new Promise((resolve, reject) => {
            try {
                this._apiClient.AddressTransactions_returningRequestHandle(
                    this._addressKeys.publicAddress,
                    this._addressKeys.privateKeys.view,
                    this._addressKeys.publicKeys.spend,
                    this._addressKeys.privateKeys.spend,
                    (err, ...result) => {

                        if (err) {
                            reject(err);
                            return;
                        }

                        // Turn these unruly callback function args into an object. 
                        let txResult = <TransactionsResult> {
                            accountScannedTxHeight: result[0],
                            accountScannedBlockHeight: result[1],
                            accountScanStartHeight: result[2],
                            transactionHeight: result[3],
                            blockchainHeight: result[4]
                        };

                        // Convert some properties on the transaction objects to be more useful for us.
                        let resultTxs: any[] = result[5];
                        let txs = resultTxs.map(tx => <TransactionInfo>{
                            amount: moneyFormatUtils.formatMoney(tx.amount),
                            totalReceived: moneyFormatUtils.formatMoney(tx.total_received),
                            totalSent: moneyFormatUtils.formatMoney(tx.total_sent),
                            coinbase: tx.coinbase,
                            hash: tx.hash,
                            height: tx.height,
                            id: tx.id,
                            mempool: tx.mempool,
                            mixin: tx.mixin,
                            timestamp: tx.timestamp,
                            unlockTime: tx.unlock_time,
                            confirmations: txResult.blockchainHeight - tx.height
                        });

                        txResult.transactions = txs;

                        resolve(txResult);
                    }
                );
            }
            catch (err) {
                // Internal error.
                reject(err);
            }
        });
    }

    sendFunds(toAddress: string, amount: string, testnet = false): Promise<SendFundsResult> {

        // Wrap the client callback oriented function in a Promise.
        return new Promise((resolve, reject) => {

            try {

                const networkType = MoneroWallet.getNetworkID(testnet);

                // Some hardcoded options (that not specifiable in GUI yet..)
                const txPriority = 1; // normal priority
                const paymentId = null;
                const isSweep: boolean = false;

                // Initiate the transaction.
                mymonero_core.monero_sendingFunds_utils.SendFunds(
                    toAddress,
                    networkType,
                    amount,
                    isSweep,
                    this._addressKeys.publicAddress,
                    this._addressKeys.privateKeys,
                    this._addressKeys.publicKeys,
                    this._apiClient,
                    paymentId,
                    txPriority,
                    code => {
                        // Intermediate status callback..
                        console.log("Send funds step " + code + ": " + mymonero_core.monero_sendingFunds_utils.SendFunds_ProcessStep_MessageSuffix[code])
                    },
                    (...result) => {
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
                    },
                    err => {
                        // Transaction problem callback..
                        reject(err);
                    }
                );
            }
            catch (err) {
                // Internal error.
                reject(err);
            }
        });
    }
}


// ---- Interfaces -----

export interface MoneyFormatUtils {
    formatMoneyFull(units: string | BigInteger);
    formatMoneyFullSymbol(units: string | BigInteger);
    formatMoney(units: string | BigInteger);
    formatMoneySymbol(units: string | BigInteger);
    parseMoney(value: string);
}

export interface AddressKeys {
    readonly mnemonic: string,
    readonly mnemonicLanguage: string;
    readonly publicAddress: string;
    readonly privateKeys: { readonly view: string, readonly spend: string };
    readonly publicKeys: { readonly view: string, readonly spend: string }
}

export interface SendFundsResult {
    toAddress;
    sentAmount;
    paymentId;
    txHash;
    txFee;
    txKey;
    mixin;
}

export interface AccountStateInfo {
    accountScannedTxHeight: number,
    accountScannedBlockHeight: number,
    accountScanStartHeight: number,
    transactionHeight: number,
    blockchainHeight: number,
}

export interface BalanceInfoResult extends AccountStateInfo {
    totalReceived: string,
    totalSent: string,
    lockedBalance: string,
    balance: string,
    balanceUsd : string,
    balanceEur: string,
    spentOutputs: any[],
    ratesBySymbol: { [ symbol: string ]: number | undefined } | undefined
}

export interface TransactionsResult extends AccountStateInfo {
    transactions: TransactionInfo[]
}

export interface TransactionInfo {
    amount: string,	
    totalReceived: string,
    totalSent: string,
    coinbase: boolean,
    hash: string,
    height: number,
    id: number,
    mempool: boolean,
    mixin: number,
    timestamp: Date,
    unlockTime: number,
    paymentId: string | null,
    confirmations: number
}


