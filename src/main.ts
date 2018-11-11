import { MoneroWallet } from './moneroWallet';
import { WalletViewModel } from './walletViewModel';
import { BlockstackAccountViewModel } from './blockstackAccountViewModel';
import * as blockstack from 'blockstack';
import { detect } from 'detect-browser';

const NODE_ENV = (function () {
    const browser = detect();
    return browser && browser.name === 'node'
})();

/*
    GUI TODO

    * Show list of transactions (link to a block explorer).
    * Show address/key details modal.
    * Send transaction modal.
    * Manual refresh button.
    * Refresh every 30s.

*/

async function main() {

    await checkNodeEnv();

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
    console.log(userData);

    // Pass Blockstack user data to viewmodel for displaying info and allowing logout. 
    let blockstackAccountViewModel = new BlockstackAccountViewModel(userData);

    // Initialize the monero util (loads the large-ish WASM module).
    await MoneroWallet.initialize();

    // Derive a monero key set from the Blockstack's user's private key. 
    let appPrivateKey = userData.appPrivateKey;
    let keys = MoneroWallet.createAddressKeysFromPrivateKey(appPrivateKey);

    // Create a the monero wallet object from the key set.
    let moneroWallet = new MoneroWallet(keys);

    // Need to make sure the account is registered with the MyMonero service
    // when the keys are first generated, so that their services can track transactions
    // for this account. 
    // TODO: use blockstack storage to determine if the MyMonero account has already been registered.
    await moneroWallet.registerNewAccount();

    let walletViewModel = new WalletViewModel(moneroWallet);
    walletViewModel.refreshData();
    walletViewModel.startPolling();

    // Register Blockstack account sign out action with stopping any wallet activities.
    blockstackAccountViewModel.onSignOut(() => {
        walletViewModel.stopPolling();
    });

}


// Kick off program. 
main().catch(err => {
    console.log("Initialization failed");
    console.log(err);
    // TODO: show this message in gui.
});



// ---- Setup for running blockstack.js within the Node.js runtime.
// TODO: Not working. Possibly cryptographic operation differences in node vs browser? 
// Alternatively, could use Selenium or something similar for doing full integration testing.

let signInServerInstance;
let signInServerAddr;

async function checkNodeEnv() {
    // If running in node then load a 'window' and 'localStorage' shim.
    // These are used by the blockstack lib.
    if (NODE_ENV) {
        let windowShim = new (require('window'))();
        let localStorageShim = new (require('node-localstorage').LocalStorage)('./scratch');
        windowShim.localStorage = localStorageShim;
        let globalObj = (global as any);
        globalObj.window = windowShim;
        globalObj.location = windowShim.location;
        globalObj.localStorage = localStorageShim;
        globalObj.navigator = windowShim.navigator;
        globalObj.document = windowShim.document;
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

        await setupSignInServer();
    }
}

async function setupSignInServer() {

    const http = require('http');
    let addr : string;

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
            res.writeHead(200);
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
    server.on('clientError', (err) =>{
        console.log('got err' + err);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let serverAddr = server.address();
    addr = `${serverAddr.address}:${serverAddr.port}`;

    signInServerAddr = addr;
    signInServerInstance = server;
}

async function performNodeSignIn() {
    let redirectUri = `http://${signInServerAddr}`;
    let manifestUrl = redirectUri + "/manifest.json";
    await new Promise(resolve => setTimeout(resolve, 3000));
    blockstack.redirectToSignIn(redirectUri, manifestUrl);
    //await new Promise(resolve => setTimeout(resolve, 1000000));
}
