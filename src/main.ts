import { MoneroWallet } from './moneroWallet';
import { WalletViewModel } from './walletViewModel';
import { BlockstackAccountViewModel } from './blockstackAccountViewModel';
import { NavigationViewModel } from './navigationViewModel';
import * as blockstack from 'blockstack';
import { detect } from 'detect-browser';
import { exec } from 'child_process';

const NODE_ENV = (function () {
    const browser = detect();
    return browser && browser.name === 'node'
})();

/* GUI TODO
    * Link transaction hashes to a block explorer.
    * Manual refresh button.
*/

NavigationViewModel.initialize();

async function main() {

    await checkNodeEnv();

    while (true) {

        let isUserSignedIn = blockstack.isUserSignedIn();

        // Check if there is a authentication request that hasn't been handled.
        // https://blockstack.github.io/blockstack.js/index.html#issigninpending
        let isSignInPending = blockstack.isSignInPending();

        if (!isUserSignedIn && !isSignInPending) {
            
            NavigationViewModel.instance.setDisplayForSignedIn(false);
            
            // Wait for user to click the sign in button (they have no other option and app is useless until then).
            await NavigationViewModel.instance.waitForLoginClick();

            // Generates an authentication request and redirects the user to the Blockstack browser to approve the sign in request.
            // https://blockstack.github.io/blockstack.js/index.html#redirecttosignin
            let manifestFile = "manifest.json";
            if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
                manifestFile = "manifest.dev.json";
            }
            blockstack.redirectToSignIn(window.location.origin + window.location.pathname, window.location.origin + window.location.pathname + manifestFile);

            // Since we are about to be redirected off the page, just continue back to waiting for
            // another sign in click. 
            // TODO: Use cross-window communication to detect login so this window doesn't stay logged out and useless.
            //       https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
            continue;
        }

        else if (!isUserSignedIn && isSignInPending) {

            // https://blockstack.github.io/blockstack.js/index.html#handlependingsignin
            // Try to process any pending sign in request by returning a Promise that resolves to the user data object if the sign in succeeds.
            try {
                await blockstack.handlePendingSignIn();
                isUserSignedIn = blockstack.isUserSignedIn();
                // Cleanup the current window's url query after a pending sign.
                try {
                    let curLocation = window.location.href;
                    let newLocation = curLocation.split("?authResponse=")[0].substring(window.location.origin.length);
                    window.history.replaceState({}, document.title, newLocation);
                }
                catch (err) {
                    // Log but ignore if an error happens during this. Just a display thing and browser support may break it.
                    console.log(err);
                }
            }
            catch (err) {

                // Problem signing in, show error notification.
                NavigationViewModel.instance.showErrorNotification(err);
                console.log(err);

                // Continue back to allow the user to try again.
                continue;
            }
        }

        if (!isUserSignedIn) {
            throw new Error("Bad application state. How did we end up here? 🤔");
        }

        // Everything is 👌 load the actual app.
        const appViewModels = await initializeSignedInApp();

        // We are done here unless user signs out.
        await NavigationViewModel.instance.waitForLogoutClick();

        // User clicked sign out, sign them out.
        blockstack.signUserOut();

        // Clean up app state.
        appViewModels.walletViewModel.dispose();
        appViewModels.blockstackAccountViewModel.dispose();
        NavigationViewModel.instance.setDisplayForSignedIn(false);
    }
}

async function initializeSignedInApp() {

    // Load the Blockstack user data.
    let userData = blockstack.loadUserData();
    console.log(userData);

    // Pass Blockstack user data to viewmodel for displaying info and allowing logout. 
    let blockstackAccountViewModel = new BlockstackAccountViewModel(userData);

    NavigationViewModel.instance.setDisplayForSignedIn(true);

    // Yield to the browser display update queue before the intensive loading.
    await new Promise(res => setTimeout(() => res(), 1));

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

    return {
        walletViewModel: walletViewModel,
        blockstackAccountViewModel: blockstackAccountViewModel
    }
}


// Kick off program. 
main().catch(err => {
    console.log("Initialization failed");
    console.log(err);
    // Show this message in gui.
    NavigationViewModel.instance.showErrorNotification(err);
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
