import { MoneroWallet, MoneroUtilLoader } from './moneroWallet';
import { WalletViewModel } from './walletViewModel';
import * as blockstack from 'blockstack';
import { detect } from 'detect-browser';

const NODE_ENV = (function () {
    const browser = detect();
    return browser && browser.name === 'node'
})();
checkNodeEnv();

/*
    GUI TODO

    * Show list of transactions (link to a block explorer).
    * Show address/key details modal.
    * Send transaction modal.
    * Manual refresh button.
    * Refresh every 30s.

*/

async function main() {

    // TODO: Show a sign in button rather than auto launching.

    let isUserSignedIn = blockstack.isUserSignedIn();

    if (!isUserSignedIn && blockstack.isSignInPending()) {
        await blockstack.handlePendingSignIn();
    }
    else if (!isUserSignedIn) {
        if (NODE_ENV) {
            performNodeSignIn();
        }
        else {
            blockstack.redirectToSignIn();
            // Exit since we are about to be redirected off the page.
            return;
        }
    }

    // Load the Blockstack user data.
    let userData = blockstack.loadUserData();

    // TODO: Pass this to a profile viewmodel for displaying info and allowing logout. 
    let profile = userData.profile;
    console.log(profile);

    // Initialize the monero util (loads the large-ish WASM module).
    await MoneroUtilLoader.load();

    // Derive a monero key set from the Blockstack's user's private key. 
    let appPrivateKey = userData.appPrivateKey;
    let keys = MoneroWallet.createAddressKeysFromPrivateKey(appPrivateKey);

    // Create a the monero wallet object from the key set.
    let moneroWallet = new MoneroWallet(keys);

    console.log(`Monero mnemonic ${keys.mnemonic}`);

    // Need to make sure the account is registered with the MyMonero service
    // when the keys are first generated, so that their services can track transactions
    // for this account. 
    // TODO: use blockstack storage to determine if the MyMonero account has already been registered.
    await moneroWallet.registerNewAccount();

    let viewModel = new WalletViewModel(moneroWallet);
    viewModel.refreshData();
    viewModel.startPolling();

}


// Kick off program. 
main().catch(err => {
    console.log("Initialization failed");
    console.log(err);
    // TODO: show this message in gui.
});


function checkNodeEnv() {
    // If running in node then load a 'window' and 'localStorage' shim.
    // These are used by the blockstack lib.
    if (NODE_ENV) {
        let windowShim = new (require('window'))();
        let localStorageShim = new (require('node-localstorage').LocalStorage)('./scratch');
        windowShim.localStorage = localStorageShim;
        (global as any).window = windowShim;
        (global as any).localStorage = localStorageShim;
        (global as any).navigator = windowShim.navigator;
        (global as any).document = windowShim.document;
        let windowLocation = windowShim.location;
        Object.defineProperty(windowShim, 'location', {
            get: () => windowLocation,
            set: (val) => {
                if (val.startsWith("blockstack:")) {
                    let start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');
                    require('child_process').exec(start + ' ' + val);
                }
            }
        });
    }
}

async function performNodeSignIn() {
    let addr;
    const http = require('http');
    const server = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Request-Method', '*');
        res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET,PUT,POST,DELETE');
        res.setHeader('Access-Control-Allow-Headers', '*');
        if ( req.method === 'OPTIONS' ) {
            res.writeHead(200);
            res.end();
        }
        if (req.url.endsWith("/manifest.json")){
            res.writeHead(200/*, { 'Content-Type': 'application/json' }*/);
            res.end(JSON.stringify({
                "name": "Hello, Blockstack",
                "start_url": addr,
                "description": "A simple demo of Blockstack Auth",
                "icons": [
                    {
                        "src": "https://helloblockstack.com/icon-192x192.png",
                        "sizes": "192x192",
                        "type": "image/png"
                    }
                ]
            }));
        }
        console.log("got here");
    });
    server.on('error', (err) =>{
        console.log('got err' + err);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let serverAddr = server.address();
    addr = `${serverAddr.address}:${serverAddr.port}`;
    let redirectUri = `http://${addr}`;
    let manifestUrl = redirectUri + "/manifest.json";
    await new Promise(resolve => setTimeout(resolve, 3000));
    blockstack.redirectToSignIn(redirectUri, manifestUrl);
    await new Promise(resolve => setTimeout(resolve, 1000000));
}

async function tests() {

    await MoneroUtilLoader.load();

    let keys = MoneroWallet.createAddressKeysFromMnemonic("input betting five balding update licks hive february dogs peaches ongoing digit five");
    let moneroWallet = new MoneroWallet(keys);
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

