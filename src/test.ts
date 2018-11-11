import * as mocha from 'mocha';
import { describe, it, before, beforeEach, after, afterEach } from 'mocha';
import * as assert from 'assert';
import { MoneroWallet } from './moneroWallet';


describe('Monero Wallet - local functions', () => {

    before(async () => {
        await MoneroWallet.initialize();
    });

    it('Should create account keys from private key', () => {
        let privateKey = '9be111fbf5e01bb8e1bd741b6cce7dd73b7d8a65e0de44d0b98c212e2accc00e';
        let keys = MoneroWallet.createAddressKeysFromPrivateKey(privateKey);
        assert.equal(keys.privateKeys.spend, privateKey);
    });

    it('Should create account keys from mnemonic', () => {
        let mnemonic = 'veteran gnome asylum exhale noted knapsack camp vats wonders biggest ablaze awful ablaze';
        let keys = MoneroWallet.createAddressKeysFromMnemonic(mnemonic);
        assert.equal(keys.mnemonic, mnemonic);
    });

});


async function tests() {
    await MoneroWallet.initialize();

    let keys1 = MoneroWallet.createAddressKeysFromPrivateKey("9be111fbf5e01bb8e1bd741b6cce7dd73b7d8a65e0de44d0b98c212e2accc00e");
    let keys2 = MoneroWallet.createAddressKeysFromMnemonic("veteran gnome asylum exhale noted knapsack camp vats wonders biggest ablaze awful ablaze");
    
    //let keys3 = MoneroWallet.createAddressKeysFromPrivateKey("323cb7ba59b5857ca767500bbf0a9b137f3d445a217826d89b8f61bd5bbe950e");
    //let keys4 = MoneroWallet.createAddressKeysFromMnemonic("input betting five balding update licks hive february dogs peaches ongoing digit five");
    let moneroWallet = new MoneroWallet(keys1);
    //let registrationResult = await moneroWallet.registerNewAccount();
    //console.log(registrationResult);

    let txs = await moneroWallet.getTransactions();
    console.log(txs);
    let walletInfo = await moneroWallet.getBalanceInfo();
    console.log(walletInfo);

    //let toAddress = "43Pzz5GFHzG4VSvoR1zievZmQ3ABZppFagWsQkdpLwV2JMmu2LLU5GgHmSbVqc7dBMAYi49BHXD3cTLWX3D4LX8k4q1AXQf";
    //let sendResult = await moneroWallet.sendFunds(toAddress, new BigNumber("0.00001"));
    //console.log(sendResult);
}


//tests().catch(err => {
//    console.log(err);
//});
