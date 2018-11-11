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
const moneroWallet_1 = require("./moneroWallet");
/*
    GUI TODO

    * Show list of transactions (link to a block explorer).
    * Show address/key details modal.
    * Send transaction modal.
    * Manual refresh button.
    * Refresh every 30s.

*/
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield moneroWallet_1.MoneroUtilLoader.load();
        console.log("worked");
    });
}
main().catch(err => {
    console.log("Initialization failed");
    console.log(err);
    // TODO: show this message in gui.
});
function tests() {
    return __awaiter(this, void 0, void 0, function* () {
        yield moneroWallet_1.MoneroUtilLoader.load();
        let keys = moneroWallet_1.MoneroWallet.createAddressKeysFromMnemonic("input betting five balding update licks hive february dogs peaches ongoing digit five");
        let moneroWallet = new moneroWallet_1.MoneroWallet(keys);
        let txs = yield moneroWallet.getTransactions();
        console.log(txs);
        let walletInfo = yield moneroWallet.getBalanceInfo();
        console.log(walletInfo);
        //let toAddress = "43Pzz5GFHzG4VSvoR1zievZmQ3ABZppFagWsQkdpLwV2JMmu2LLU5GgHmSbVqc7dBMAYi49BHXD3cTLWX3D4LX8k4q1AXQf";
        //let sendResult = await moneroWallet.sendFunds(toAddress, new BigNumber("0.00001"));
        //console.log(sendResult);
    });
}
//tests().catch(err => { console.log(err); });
//# sourceMappingURL=gui.js.map