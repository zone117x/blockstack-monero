import { MoneroWallet, TransactionInfo } from './moneroWallet';
import { NavigationViewModel } from './navigationViewModel';

/** Getters for the various wallet related DOM elements. */
class View {
    static get accountPublicAddress() { return document.querySelector<HTMLSpanElement>('#account-public-address')! }
    static get balanceXmr() { return document.querySelector<HTMLSpanElement>('#balance-xmr')! }
    static get balanceUsd() { return document.querySelector<HTMLSpanElement>('#balance-usd')! }
    static get balanceEur() { return document.querySelector<HTMLSpanElement>('#balance-eur')! }
    static get transactionRowTemplate() { return document.querySelector<HTMLElement>('#transaction-row-template')! }
    static get transactionTableBody() { return document.querySelector<HTMLElement>('#transaction-table-body')! }
    static get transactionRows() { return this.transactionTableBody.querySelectorAll<HTMLElement>('.transaction-row') }
    static get sendMoneroForm() { return document.querySelector<HTMLFormElement>('#send-monero-form')! }
    static get sendAddressReceiver() { return document.querySelector<HTMLInputElement>('#send-address-receiver')! }
    static get sendAmount() { return document.querySelector<HTMLInputElement>('#send-amount')! }
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

    readonly _disposals: (() => void)[] = [];

    constructor (wallet: MoneroWallet) {
        this._wallet = wallet;
        this.setAccountDisplayDetails();
        this.hookupSendMoneroSubmitForm();
    }

    // Subscribe to the send monero form submit action.
    hookupSendMoneroSubmitForm() {
        const _this = this;
        const onSubmitFunc = (ev: Event) => {
            // Prevent browser POST.
            ev.preventDefault();
            _this.sendMoneroFormAction()
            .then(() => {
                // Success! Return to the transaction page and show notification.
                NavigationViewModel.instance.showTransactionsPage();
                NavigationViewModel.instance.showSuccessNotification("Transaction sent!");
            })
            .catch(err => {
                // Problem sending transaction - show error notification.
                NavigationViewModel.instance.showErrorNotification(err);
                console.log(err);
            });
            return false;
        }
        View.sendMoneroForm.addEventListener('submit', onSubmitFunc);

        // Register the event handler for removal when the wallet view is disposed.
        this._disposals.push(() => View.sendMoneroForm.removeEventListener('submit', onSubmitFunc));
    }

    async sendMoneroFormAction() {

        // Get user input
        const toAddress = View.sendAddressReceiver.value;
        const sendAmount = View.sendAmount.value;

        // Attempt to send transaction (errors are handled by the promise caller).
        await this._wallet.sendFunds(toAddress, sendAmount);

        // Clear inputs.
        View.sendAddressReceiver.value = '';
        View.sendAmount.value = '';
    }

    setAccountDisplayDetails() {
        View.accountPublicAddress.innerText = this._wallet.addressKeys.publicAddress;
    }

    // Sets up the update timer (refreshes info every 15 seconds).
    startPolling() {
        if (!this._isPolling) {
            this._isPolling = true;
            this._pollerID = window.setInterval(() => this.refreshData(), 15000);
            this._disposals.push(() => this.stopPolling());
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
        this.loadMoneroTransactions().catch(err => this.showUpdateError(err));
        this.loadBalanceInfo().catch(err => this.showUpdateError(err));
    }

    showUpdateError(err) {
        // Show errors as notifications.
        NavigationViewModel.instance.showErrorNotification(err);
        console.log(err);
        throw err;
    }
    
    async loadBalanceInfo() {
        let walletInfo = await this._wallet.getBalanceInfo();
        console.log(walletInfo);

        // Update the DOM with balance info.
        View.balanceXmr.innerText = walletInfo.balance;
        View.balanceUsd.innerText = walletInfo.balanceUsd;
        View.balanceEur.innerText = walletInfo.balanceEur;
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
        this._disposals.forEach(disposeFn => disposeFn());
        this._disposals.length = 0;
    }
    
}