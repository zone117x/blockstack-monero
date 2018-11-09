import HostedMoneroAPIClient from '../libs/mymonero-app-js/local_modules/HostedMoneroAPIClient/HostedMoneroAPIClient.Lite';
import BackgroundResponseParser from '../libs/mymonero-app-js/local_modules/HostedMoneroAPIClient/BackgroundResponseParser.web';
import { monero_amount_format_utils, monero_sendingFunds_utils, nettype_utils } from '../libs/mymonero-app-js/local_modules/mymonero_core_js';
import request from 'request';
import { BigNumber } from 'bignumber.js';
import moment from 'moment';

interface IWalletData {
	publicAddress: string;
	privateKeys: { view: string, spend: string };
	publicKeys: { view: string, spend: string }
}

interface ISendFundsResult {
	toAddress;
	sentAmount;
	paymentId;
	txHash;
	txFee;
	txKey;
	mixin;
}

interface ICommonResultValues {
	accountScannedTxHeight: number,
	accountScannedBlockHeight: number,
	accountScanStartHeight: number,
	transactionHeight: number,
	blockchainHeight: number,
}

interface IWalletInfoResult extends ICommonResultValues {
	totalReceived: BigNumber,
	lockedBalance: BigNumber,
	totalSent: BigNumber,
	spentOutputs: any[],
	ratesBySymbol: {symbol: string, rate: number}[]
}

interface ITransactionsResult extends ICommonResultValues {
	transactions: ITransactionInfo[]
}

interface ITransactionInfo {
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

class MoneroWallet {

	readonly _apiClient;
	readonly _walletData: IWalletData;

	constructor(walletData: IWalletData) {

		this._walletData = walletData;

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

	getWalletInfo() : Promise<any> {

		// Wrap the client callback oriented function in a Promise.
		return new Promise((resolve, reject) => {
			try {
				this._apiClient.AddressInfo_returningRequestHandle(
					this._walletData.publicAddress,
					this._walletData.privateKeys.view,
					this._walletData.publicKeys.spend,
					this._walletData.privateKeys.spend,
					(err, ...result: any[]) => {

						if (err) {
							reject(err);
						}

						// The MyMonero API client returns all this data in the form of callback args, oh my.
						// Whip this argument list into a manageable object.
						let info : IWalletInfoResult = {

							// These amount values are in piconero, convert to human readable amount.
							totalReceived: monero_amount_format_utils.formatMoney(result[0]),
							lockedBalance: monero_amount_format_utils.formatMoney(result[1]),
							totalSent: monero_amount_format_utils.formatMoney(result[2]),

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

	getTransactions() : Promise<ITransactionsResult> {

		// Wrap the client callback oriented function in a Promise.
		return new Promise((resolve, reject) => {
			try {
				this._apiClient.AddressTransactions_returningRequestHandle(
					this._walletData.publicAddress,
					this._walletData.privateKeys.view,
					this._walletData.publicKeys.spend,
					this._walletData.privateKeys.spend,
					(err,
						accountScannedHeight,
						accountScannedBlockHeight,
						accountScanStartHeight,
						transactionHeight,
						blockchainHeight, 
						transactions: any[]) => {

						if (err) {
							reject(err);
						}

						// Convert some properties on the transaction object to be more useful for us.
						let txs = transactions.map(tx => <ITransactionInfo>{
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
						let result : ITransactionsResult = {
							accountScannedTxHeight: accountScannedHeight,
							accountScannedBlockHeight: accountScannedBlockHeight,
							accountScanStartHeight: accountScanStartHeight,
							transactionHeight: transactionHeight,
							blockchainHeight: blockchainHeight,
							transactions: txs
						};

						resolve(result);
					}
				);
			}
			catch (err) {
				// Internal error.
				reject(err);
			}
		});
	}

	sendFunds(toAddress : string, amount: BigNumber) : Promise<ISendFundsResult> {

		// Wrap the client callback oriented function in a Promise.
		return new Promise((resolve, reject) => {

			try {

				// Convert the BigNumber to a string.
				let amountString = amount.toString();

				// Some hardcoded options (that not specifiable in GUI yet..)
				const txPriority = 1;
				const paymentId = null;
				const isSweep : boolean = false;
				const networkType = nettype_utils.network_type.MAINNET;

				monero_sendingFunds_utils.SendFunds(
					toAddress,
					networkType,
					amountString,
					isSweep, 
					this._walletData.publicAddress,
					this._walletData.privateKeys,
					this._walletData.publicKeys,
					this._apiClient,
					paymentId,
					txPriority,
					code => {
						// Intermediate status callback..
						console.log("Send funds step " + code + ": " + monero_sendingFunds_utils.SendFunds_ProcessStep_MessageSuffix[code])
					},
					(toAddr, sentAmount, finalPaymentId, txHash, txFee, txKey, mixin) => {
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

let toAddress = "42pVXU53GnA24zoiBpvcwsGEcnXvjdAG2aScfMW7Kkck9ftGfpb9pwRXUQAas2e8jKHYKvXaZNosGYAqwJYwhbCu7KjkYxo";

let wallet : IWalletData = {
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

// TODO: find the utility to convert raw private key bytes from blockstack to a monero seed.

let moneroWallet = new MoneroWallet(wallet);

async function tests() {
	let txs = await moneroWallet.getTransactions();
	let walletInfo = await moneroWallet.getWalletInfo();
	console.log(walletInfo);
	await moneroWallet.sendFunds(toAddress, new BigNumber("0.0001"));
}

tests().then(result => {
	console.log(result);
})
.catch(err => {
	console.log(err);
});
