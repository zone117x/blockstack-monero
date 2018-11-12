import { assert } from 'chai';
import { MoneroWallet } from './moneroWallet';


describe('Monero Wallet - local functions', () => {

    before(async () => {
        await MoneroWallet.initialize();
    });

    it('Should create account keys from private key', () => {
        let privateKey = '9be111fbf5e01bb8e1bd741b6cce7dd73b7d8a65e0de44d0b98c212e2accc00e';
        let keys = MoneroWallet.createAddressKeysFromPrivateKey(privateKey);
        assert.equal(keys.mnemonic, "muppet sensible sack idiom rarest inquest ruined western atom diode pause leech academy grunt sash session hickory deity inbound catch gang yawning older pivot gang");
        assert.equal(keys.privateKeys.spend, privateKey);
        assert.equal(keys.publicAddress, "43Pzz5GFHzG4VSvoR1zievZmQ3ABZppFagWsQkdpLwV2JH5YCY3bmyvFjXxcd1XAnYS6P4bWzx1YvATW7gZNUg7t3paPcE6");
    });

    it('Should create account keys from mnemonic', () => {
        let mnemonic = 'veteran gnome asylum exhale noted knapsack camp vats wonders biggest ablaze awful ablaze';
        let keys = MoneroWallet.createAddressKeysFromMnemonic(mnemonic);
        assert.equal(keys.mnemonic, mnemonic);
        assert.equal(keys.privateKeys.spend, "9be111fbf5e01bb8e1bd741b6cce7dd73b7d8a65e0de44d0b98c212e2accc00e");
        assert.equal(keys.publicAddress, "43Pzz5GFHzG4VSvoR1zievZmQ3ABZppFagWsQkdpLwV2JMmu2LLU5GgHmSbVqc7dBMAYi49BHXD3cTLWX3D4LX8k4q1AXQf");
    });

    it('Should create account keys from private key #2', () => {
        let privateKey = '6ee9aef42ea857ed823fad4e0f507fe5f9bf25a090cc33914296814fe86abe35';
        let keys = MoneroWallet.createAddressKeysFromPrivateKey(privateKey);
        assert.equal(keys.mnemonic, "also ringing powder nuns python optical trendy building jaunt delayed loyal idols audio galaxy vogue welders heels video dime ridges aisle oozed picked toolbox heels");
        assert.equal(keys.privateKeys.spend, privateKey);
        assert.equal(keys.publicAddress, "46ovAuz8XPTCKeXJsWKs6rN6REZMHrsy8MYJECB7jzS5dviR9RQqLWpZ5D23W8tgvsbUcjWyGGeRQLoeK3idLjNqHPSBo6B");
    });

});

describe('Monero Wallet - MyMonero API', () => {

    let moneroWallet : MoneroWallet;

    before(async () => {
        await MoneroWallet.initialize();
        let keys = MoneroWallet.createAddressKeysFromMnemonic("input betting five balding update licks hive february dogs peaches ongoing digit five");
        moneroWallet = new MoneroWallet(keys);
    });

    it('Should allow account login / register', async () => {
        let registrationResult = await moneroWallet.registerNewAccount();
        console.log(registrationResult);
        assert.equal(registrationResult.alreadyRegistered, true);
    });

    it('Should get wallet balance info', async () => {
        let walletInfo = await moneroWallet.getBalanceInfo();
        console.log(walletInfo);
        assert.isAbove(parseFloat(walletInfo.totalReceived), 0);
        assert.isAbove(parseFloat(walletInfo.totalSent), 0);
    });

    it('Should get transaction info', async() => {
        let txs = await moneroWallet.getTransactions();
        console.log(txs);
        assert.isAbove(txs.accountScannedBlockHeight, 0);
        assert.isAbove(txs.accountScannedTxHeight, 0);
        assert.isAbove(txs.accountScanStartHeight, 0);
        assert.isAbove(txs.blockchainHeight, 0);
        assert.isAbove(txs.transactionHeight, 0);
    });

    it('Should send funds', async () => {
        let toAddress = "43Pzz5GFHzG4VSvoR1zievZmQ3ABZppFagWsQkdpLwV2JMmu2LLU5GgHmSbVqc7dBMAYi49BHXD3cTLWX3D4LX8k4q1AXQf";
        let sendResult = await moneroWallet.sendFunds(toAddress, "0.00001");
        console.log(sendResult);
        assert.equal(sendResult.toAddress, toAddress);
        assert.isAbove(sendResult.sentAmount, 0);
    });

});