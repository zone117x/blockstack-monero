"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const moneroWallet_1 = require("./moneroWallet");
const walletViewModel_1 = require("./walletViewModel");
const blockstack = __importStar(require("blockstack"));
const detect_browser_1 = require("detect-browser");
const NODE_ENV = (function () {
    const browser = detect_browser_1.detect();
    return browser && browser.name === 'node';
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
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO: Show a sign in button rather than auto launching.
        let isUserSignedIn = blockstack.isUserSignedIn();
        if (!isUserSignedIn && blockstack.isSignInPending()) {
            yield blockstack.handlePendingSignIn();
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
        yield moneroWallet_1.MoneroUtilLoader.load();
        // Derive a monero key set from the Blockstack's user's private key. 
        let appPrivateKey = userData.appPrivateKey;
        let keys = moneroWallet_1.MoneroWallet.createAddressKeysFromPrivateKey(appPrivateKey);
        // Create a the monero wallet object from the key set.
        let moneroWallet = new moneroWallet_1.MoneroWallet(keys);
        console.log(`Monero mnemonic ${keys.mnemonic}`);
        // Need to make sure the account is registered with the MyMonero service
        // when the keys are first generated, so that their services can track transactions
        // for this account. 
        // TODO: use blockstack storage to determine if the MyMonero account has already been registered.
        yield moneroWallet.registerNewAccount();
        let viewModel = new walletViewModel_1.WalletViewModel(moneroWallet);
        viewModel.refreshData();
        viewModel.startPolling();
    });
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
        global.window = windowShim;
        global.localStorage = localStorageShim;
        global.navigator = windowShim.navigator;
        global.document = windowShim.document;
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
function performNodeSignIn() {
    return __awaiter(this, void 0, void 0, function* () {
        let addr;
        const http = require('http');
        const server = http.createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Request-Method', '*');
            res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,GET,PUT,POST,DELETE');
            res.setHeader('Access-Control-Allow-Headers', '*');
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
            }
            if (req.url.endsWith("/manifest.json")) {
                res.writeHead(200 /*, { 'Content-Type': 'application/json' }*/);
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
        server.on('error', (err) => {
            console.log('got err' + err);
        });
        yield new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        let serverAddr = server.address();
        addr = `${serverAddr.address}:${serverAddr.port}`;
        let redirectUri = `http://${addr}`;
        let manifestUrl = redirectUri + "/manifest.json";
        yield new Promise(resolve => setTimeout(resolve, 3000));
        blockstack.redirectToSignIn(redirectUri, manifestUrl);
        yield new Promise(resolve => setTimeout(resolve, 1000000));
    });
}
function tests() {
    return __awaiter(this, void 0, void 0, function* () {
        yield moneroWallet_1.MoneroUtilLoader.load();
        let keys = moneroWallet_1.MoneroWallet.createAddressKeysFromMnemonic("input betting five balding update licks hive february dogs peaches ongoing digit five");
        let moneroWallet = new moneroWallet_1.MoneroWallet(keys);
        //let registrationResult = await moneroWallet.registerNewAccount();
        //console.log(registrationResult);
        let txs = yield moneroWallet.getTransactions();
        console.log(txs);
        let walletInfo = yield moneroWallet.getBalanceInfo();
        console.log(walletInfo);
        //let toAddress = "43Pzz5GFHzG4VSvoR1zievZmQ3ABZppFagWsQkdpLwV2JMmu2LLU5GgHmSbVqc7dBMAYi49BHXD3cTLWX3D4LX8k4q1AXQf";
        //let sendResult = await moneroWallet.sendFunds(toAddress, new BigNumber("0.00001"));
        //console.log(sendResult);
    });
}
//# sourceMappingURL=main.js.map