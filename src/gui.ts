import { MoneroWallet, MoneroUtilLoader } from './moneroWallet';
    
/*
    GUI TODO

    * Show list of transactions (link to a block explorer).
    * Show address/key details modal.
    * Send transaction modal.
    * Manual refresh button.
    * Refresh every 30s.

*/

async function main(){
    await MoneroUtilLoader.load();
    console.log("worked");
}

main().catch(err => {
    console.log("Initialization failed");
    console.log(err);
    // TODO: show this message in gui.
});



async function tests() {

    await MoneroUtilLoader.load();

    let keys = MoneroWallet.createAddressKeysFromMnemonic("input betting five balding update licks hive february dogs peaches ongoing digit five");
    let moneroWallet = new MoneroWallet(keys);

    let txs = await moneroWallet.getTransactions();
    console.log(txs);
    let walletInfo = await moneroWallet.getBalanceInfo();
    console.log(walletInfo);

    //let toAddress = "43Pzz5GFHzG4VSvoR1zievZmQ3ABZppFagWsQkdpLwV2JMmu2LLU5GgHmSbVqc7dBMAYi49BHXD3cTLWX3D4LX8k4q1AXQf";
    //let sendResult = await moneroWallet.sendFunds(toAddress, new BigNumber("0.00001"));
    //console.log(sendResult);
}

//tests().catch(err => { console.log(err); });