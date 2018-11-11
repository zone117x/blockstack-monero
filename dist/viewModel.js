"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class ViewModel {
    constructor(wallet) {
        this._isPolling = false;
        this._wallet = wallet;
        // TODO: Store references to the various DOM components needed.
    }
    // Sets up the update timer (refreshes info every 30 seconds).
    startPolling() {
        if (!this._isPolling) {
            this._isPolling = true;
            this._pollerID = window.setInterval(this.handleUpdatePoll, 30000);
        }
    }
    // Stop the update timer.
    stopPolling() {
        if (this._isPolling) {
            this._isPolling = false;
            clearInterval(this._pollerID);
        }
    }
    handleUpdatePoll() {
        // Kick off both update requests at the same time.
        this.loadMoneroTransactions().catch(this.showUpdateError);
        this.loadBalanceInfo().catch(this.showUpdateError);
    }
    showUpdateError(err) {
        // TODO: Show errors in a cleanly stackable way (imagine 100 of these happening over time).
    }
    loadBalanceInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            let walletInfo = yield this._wallet.getBalanceInfo();
            console.log(walletInfo);
            // TODO: Update the DOM with balance info.
        });
    }
    loadMoneroTransactions() {
        return __awaiter(this, void 0, void 0, function* () {
            let txs = yield this._wallet.getTransactions();
            console.log(txs);
            // TODO: Update the transaction table with tx info.
        });
    }
}
exports.ViewModel = ViewModel;
//# sourceMappingURL=viewModel.js.map