import { MoneroWallet } from './moneroWallet';

class View {
    static get accountPublicAddress() : HTMLSpanElement {
        return document.getElementById('account-public-address')!;
    }
    static get balanceXmr() : HTMLSpanElement {
        return document.getElementById('balance-xmr')!;
    }
    static get balanceUsd() : HTMLSpanElement {
        return document.getElementById('balance-usd')!;
    }
    static get balanceEur() : HTMLSpanElement {
        return document.getElementById('balance-eur')!;
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
        // TODO: Show errors in a cleanly stackable way (imagine 100 of these happening over time).
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
        let txs = await this._wallet.getTransactions();
        console.log(txs);

        // TODO: Update the transaction table with tx info.
    }

    dispose() {
        // TODO: disconnect from any DOM subscriptions or references.
    }
    
}