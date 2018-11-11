import { MoneroWallet } from './moneroWallet';

export class WalletViewModel {

    readonly _wallet: MoneroWallet;
    _isPolling: boolean = false;
    _pollerID: number | undefined;
    
    constructor (wallet: MoneroWallet) {
        this._wallet = wallet;

        // TODO: Store references to the various DOM components needed.
    }

    // Sets up the update timer (refreshes info every 30 seconds).
    startPolling() {
        if (!this._isPolling) {
            this._isPolling = true;
            this._pollerID = window.setInterval(() => this.refreshData(), 30000);
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

        // TODO: Update the DOM with balance info.
    }
    
    async loadMoneroTransactions() {
        let txs = await this._wallet.getTransactions();
        console.log(txs);

        // TODO: Update the transaction table with tx info.
    }
    
}