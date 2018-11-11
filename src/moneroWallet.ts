import HostedMoneroAPIClient from '../libs/mymonero-app-js/local_modules/HostedMoneroAPIClient/HostedMoneroAPIClient_Base';
import BackgroundResponseParser from '../libs/mymonero-app-js/local_modules/HostedMoneroAPIClient/BackgroundResponseParser.web';
import * as mymonero_core from '../libs/mymonero-app-js/local_modules/mymonero_core_js/index';
import request from 'request';
import { BigNumber } from 'bignumber.js';


/**
 * Caches the asynchronous loaded monero_utils object.
 * 
 * @remarks
 * The monero_utils import is a promise but has synchronous methods
 * that we want to use without forcing whole call chains into async/awaits.
 */
export class MoneroUtilLoader {

	static _util;

	static get util() {
		if (!this._util) {
			throw new Error("MoneroUtilLoader has not been loaded.");
		}
		return this._util;
	}

	static async load() {
		if (!this._util) {
			this._util = await mymonero_core.monero_utils_promise;
		}
	}
}


interface AddressKeys {
	readonly mnemonic: string,
	readonly mnemonicLanguage: string;
	readonly publicAddress: string;
	readonly privateKeys: { readonly view: string, readonly spend: string };
	readonly publicKeys: { readonly view: string, readonly spend: string }
}

interface SendFundsResult {
	toAddress;
	sentAmount;
	paymentId;
	txHash;
	txFee;
	txKey;
	mixin;
}

interface AccountStateInfo {
	accountScannedTxHeight: number,
	accountScannedBlockHeight: number,
	accountScanStartHeight: number,
	transactionHeight: number,
	blockchainHeight: number,
}

interface BalanceInfoResult extends AccountStateInfo {
	totalReceived: BigNumber,
	totalSent: BigNumber,
	lockedBalance: BigNumber,
	balance: BigNumber,
	spentOutputs: any[],
	ratesBySymbol: { symbol: string, rate: number }[]
}

interface TransactionsResult extends AccountStateInfo {
	transactions: TransactionInfo[]
}

interface TransactionInfo {
	amount: BigNumber,
	coinbase: boolean,
	hash: string,
	height: number,
	id: number,
	mempool: boolean,
	mixin: number,
	timestamp: Date,
	totalReceived: BigNumber,
	totalSent: BigNumber,
	unlockTime: number,
	paymentId: string | null
}



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
export class MoneroWallet {

	readonly _apiClient;
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
		let keys = MoneroUtilLoader.util.newly_created_wallet(localeLanguageCode, networkType);
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
		const keys = MoneroUtilLoader.util.seed_and_keys_from_mnemonic(mnemonic, networkType);

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

		return result;
	}

	static createAddressKeysFromPrivateKey(privateKey: string, wordSetLanguage = "English", testnet = false): AddressKeys {

		// Create mnemonic from the given private key.
		const mnemonic: string = MoneroUtilLoader.util.mnemonic_from_seed(privateKey, wordSetLanguage);

		return this.createAddressKeysFromMnemonic(mnemonic, wordSetLanguage, testnet);
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
						}

						// The MyMonero API client returns all this data in the form of callback args, oh my.
						// Whip this argument list into a manageable object.
						let info: BalanceInfoResult = {

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
						}

						// Convert some properties on the transaction objects to be more useful for us.
						let resultTxs: any[] = result[5];
						let txs = resultTxs.map(tx => <TransactionInfo>{
							amount: new BigNumber(tx.amount.toString()),
							totalReceived: new BigNumber(tx.total_received.toString()),
							totalSent: new BigNumber(tx.total_sent.toString()),
							coinbase: tx.coinbase,
							hash: tx.hash,
							height: tx.height,
							id: tx.id,
							mempool: tx.mempool,
							mixin: tx.mixin,
							timestamp: tx.timestamp,
							unlockTime: tx.unlock_time
						});

						// Turn these unruly callback function args into an object. 
						let txResult: TransactionsResult = {
							accountScannedTxHeight: result[0],
							accountScannedBlockHeight: result[1],
							accountScanStartHeight: result[2],
							transactionHeight: result[3],
							blockchainHeight: result[4],
							transactions: txs
						};

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

	sendFunds(toAddress: string, amount: BigNumber, testnet = false): Promise<SendFundsResult> {

		// Wrap the client callback oriented function in a Promise.
		return new Promise((resolve, reject) => {

			try {

				// Convert the BigNumber to a string.
				let amountString = amount.toString();

				const networkType = MoneroWallet.getNetworkID(testnet);

				// Some hardcoded options (that not specifiable in GUI yet..)
				const txPriority = 1; // normal priority
				const paymentId = null;
				const isSweep: boolean = false;

				mymonero_core.monero_sendingFunds_utils.SendFunds(
					toAddress,
					networkType,
					amountString,
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
