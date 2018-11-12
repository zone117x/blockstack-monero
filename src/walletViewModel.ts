import { MoneroWallet, TransactionInfo } from './moneroWallet';
import { NavigationViewModel } from './navigationViewModel';

/** Getters for the various wallet related DOM elements. */
class View {
    static get accountPublicAddress() { return document.querySelector<HTMLSpanElement>('#account-public-address')! }
    static get accountDetailsButton() { return document.querySelector<HTMLButtonElement>('#account-details-button')! }
    static get balanceXmr() { return document.querySelector<HTMLSpanElement>('#balance-xmr')! }
    static get balanceUsd() { return document.querySelector<HTMLSpanElement>('#balance-usd')! }
    static get balanceEur() { return document.querySelector<HTMLSpanElement>('#balance-eur')! }
    static get transactionRowTemplate() { return document.querySelector<HTMLElement>('#transaction-row-template')! }
    static get transactionTableBody() { return document.querySelector<HTMLElement>('#transaction-table-body')! }
    static get transactionRows() { return this.transactionTableBody.querySelectorAll<HTMLElement>('.transaction-row') }
    static get sendMoneroForm() { return document.querySelector<HTMLFormElement>('#send-monero-form')! }
    static get sendAddressReceiver() { return document.querySelector<HTMLInputElement>('#send-address-receiver')! }
    static get sendAmount() { return document.querySelector<HTMLInputElement>('#send-amount')! }
    static get accountDetailsTemplate() { return document.querySelector<HTMLElement>('#account-details-template')! }
    static newAccountDetails() {
        let accountDetails = this.accountDetailsTemplate.firstElementChild!.cloneNode(true) as HTMLElement;
        return {
            container: accountDetails,
            address: accountDetails.querySelector<HTMLElement>('.account-details-address')!,
            spendKey: accountDetails.querySelector<HTMLElement>('.account-details-spendkey')!,
            viewKey: accountDetails.querySelector<HTMLElement>('.account-details-viewkey')!,
            mnemonic: accountDetails.querySelector<HTMLElement>('.account-details-mnemonic')!
        };
    }
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
        txRowElement.querySelector<HTMLSpanElement>('.transaction-unconfirmed')!.innerHTML = tx.confirmations < 5 ? "unconfirmed" : '';
        txRowElement.dataset[this._txHashDataKey] =  tx.hash;
    }
}

export class WalletViewModel {

    readonly _wallet: MoneroWallet;
    _isPolling: boolean = false;
    _pollerID: number | undefined;

    // Functions to be called when this view model is disposed of (DOM disconnects, timer unloads, etc).
    readonly _disposals: (() => void)[] = [];

    constructor (wallet: MoneroWallet) {
        this._wallet = wallet;
        this.setAccountDisplayDetails();
        this.hookupSendMoneroSubmitForm();
        this.hookupAccountDetailsButton();
    }

    // Subscribe to the send monero form submit action.
    hookupSendMoneroSubmitForm() {

        // The 'this' scope is destroyed with the DOM callback setting it to the element.
        const _this = this;
        const onSubmitFunc = (ev: Event) => {
            // Prevent browser POST.
            ev.preventDefault();
            _this.sendMoneroFormAction();
            return false;
        }
        View.sendMoneroForm.addEventListener('submit', onSubmitFunc);

        // Register the event handler for removal when the wallet view is disposed.
        this._disposals.push(() => View.sendMoneroForm.removeEventListener('submit', onSubmitFunc));
    }

    async sendMoneroFormAction() {
        try {
            // Get user input
            const toAddress = View.sendAddressReceiver.value;
            const sendAmount = View.sendAmount.value;

            // Attempt to send transaction (errors are handled by the promise caller).
            await this._wallet.sendFunds(toAddress, sendAmount);

            // Success! Return to the transaction page and show notification.
            NavigationViewModel.instance.showTransactionsPage();
            NavigationViewModel.instance.showSuccessNotification("Transaction sent!");
            
            // Clear inputs.
            View.sendAddressReceiver.value = '';
            View.sendAmount.value = '';
        }
        catch (err) {
            // Problem sending transaction - show error notification.
            NavigationViewModel.instance.showErrorNotification(err);
            console.log(err);
        }
    }

    // Setup the account button to show the account key details.
    hookupAccountDetailsButton() {

        // The 'this' scope is destroyed with the DOM callback setting it to the element.
        const _this = this;
        const onClick = (ev: Event) => _this.showAccountDetails();
        View.accountDetailsButton.addEventListener('click', onClick);

        // Register the event handler for removal when the wallet view is disposed.
        this._disposals.push(() => View.accountDetailsButton.removeEventListener('click', onClick));
    }

    showAccountDetails() {

        // Get a new account details DOM element.
        let accountDetails = View.newAccountDetails();

        // Populate element with info.
        accountDetails.address.innerText = this._wallet.addressKeys.publicAddress;
        accountDetails.viewKey.innerText = this._wallet.addressKeys.privateKeys.view;
        accountDetails.spendKey.innerText = this._wallet.addressKeys.privateKeys.spend;
        accountDetails.mnemonic.innerText = this._wallet.addressKeys.mnemonic;

        // Show element in an alert.
        (window as any).alertify.alert().setting({
            title: "Account Details",
            message: accountDetails.container,
            maximizable: true,
            transition: 'none',
            onclose: () => {
                // Dispose of element when alert is closed.
                accountDetails.container.remove();
            }
        }).show();
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
        txs.reverse().forEach(txInfo => {

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