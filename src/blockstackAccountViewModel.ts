
class View {
    static get blockStackAccountName() { return document.querySelector<HTMLSpanElement>('#blockstack-account-name')! }
}

export class BlockstackAccountViewModel {

    readonly _userData;

    _onSignOutListeners : (() => void)[] = [];

    constructor(userData) {
        this._userData = userData;
        this.updateDisplay();
    }

    updateDisplay() {
        View.blockStackAccountName.innerText = this._userData.profile.name;
    }

    dispose() {
        View.blockStackAccountName.innerText = '';
    }
}