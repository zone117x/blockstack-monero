import { MoneroWallet, TransactionInfo } from './moneroWallet';

/** Getters for the various wallet related DOM elements. */
class View {
    static get accountPublicAddress() { return document.querySelector<HTMLSpanElement>('#account-public-address')! }
    static get balanceXmr() { return document.querySelector<HTMLSpanElement>('#balance-xmr')! }
    static get balanceUsd() { return document.querySelector<HTMLSpanElement>('#balance-usd')! }
    static get balanceEur() { return document.querySelector<HTMLSpanElement>('#balance-eur')! }
    static get transactionRowTemplate() { return document.querySelector<HTMLElement>('#transaction-row-template')! }
    static get transactionTableBody() { return document.querySelector<HTMLElement>('#transaction-table-body')! }
    static get transactionRows() { return this.transactionTableBody.querySelectorAll<HTMLElement>('.transaction-row') }
}

/** Helper util for transaction row elements. */
class TransactionRow {
    static readonly _txHashDataKey = "txhash";
    static getTxHash(transactionRowElement: HTMLElement) {
        return transactionRowElement.dataset[this._txHashDataKey] || '';
    }
    static update(txRowElement: HTMLElement, tx: TransactionInfo) {
        txRowElement.querySelector<HTMLSpanElement>('.transaction-value')!.innerText = tx.amount;
        txRowElement.querySelector<HTMLSpanElement>('.transaction-date')!.innerText = tx.timestamp.toLocaleString();
        txRowElement.querySelector<HTMLSpanElement>('.transaction-mixin')!.innerText = tx.mixin.toString();
        txRowElement.querySelector<HTMLSpanElement>('.transaction-hash')!.innerText = tx.hash;
        txRowElement.dataset[this._txHashDataKey] =  tx.hash;
    }
}

export class WalletViewModel {

    readonly _wallet: MoneroWallet;
    _isPolling: boolean = false;
    _pollerID: number | undefined;


    constructor (wallet: MoneroWallet) {
        this._wallet = wallet;
        this.setAccountDisplayDetails();
    }

    setAccountDisplayDetails() {
        View.accountPublicAddress.innerText = this._wallet.addressKeys.publicAddress;
    }

    // Sets up the update timer (refreshes info every 15 seconds).
    startPolling() {
        if (!this._isPolling) {
            this._isPolling = true;
            this._pollerID = window.setInterval(() => this.refreshData(), 15000);
        }
    }

    // Stop the update timer.
    stopPolling() {
        if (this._isPolling){
            this._isPolling = false;
            clearInterval(this._pollerID);
        }
    }

    refreshData() {
        // Kick off both update requests at the same time.
        this.loadMoneroTransactions().catch(this.showUpdateError);
        this.loadBalanceInfo().catch(this.showUpdateError);
    }

    showUpdateError(err) {
        throw err;
        // TODO: Show errors in a cleanly stack-able way (imagine 100 of these happening over time).
    }
    
    async loadBalanceInfo() {
        let walletInfo = await this._wallet.getBalanceInfo();
        console.log(walletInfo);

        View.balanceXmr.innerText = walletInfo.balance;
        View.balanceUsd.innerText = walletInfo.balanceUsd;
        View.balanceEur.innerText = walletInfo.balanceEur;

        // TODO: Update the DOM with balance info.
    }
    
    async loadMoneroTransactions() {
        let txResult = await this._wallet.getTransactions();
        console.log(txResult);
        let txs = txResult.transactions;
        
        // Grab the DOM elements that are repeatedly needed.
        const rowTemplate = View.transactionRowTemplate;
        const tableBody = View.transactionTableBody;
        const existingRows = View.transactionRows;
        
        // TODO: Inverse these loops to perform only one iteration over the DOM row elements since iterating the DOM 
        // for each tx is probably inefficient. 

        // TODO: Implement pagination (or table w/ element reuse) for lots of rows (hopefully find any existing simple lib).

        txs.forEach(txInfo => {

            let txRowElement: HTMLElement | undefined;

            // Search the existing rows for a matching transaction.
            for (let i = 0; i < existingRows.length; i++) {
                if (TransactionRow.getTxHash(existingRows[i]) === txInfo.hash) {
                    txRowElement = existingRows[i];
                    break;
                }
            }

            // Existing row was not found so create a new one.
            if (!txRowElement) {
                txRowElement = rowTemplate.firstElementChild!.cloneNode(true) as HTMLElement;
                tableBody.prepend(txRowElement);
            }

            TransactionRow.update(txRowElement, txInfo);

        });
    }

    dispose() {
        // TODO: disconnect from any DOM subscriptions or references.
    }
    
}