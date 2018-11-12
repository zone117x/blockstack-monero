

/** Getters for the various page navigation related DOM elements. */
class View {
    static get sendMoneroPageButton() { return document.querySelector<HTMLButtonElement>('#send-monero-page-button')! }
    static get cancelSendButton() { return document.querySelector<HTMLButtonElement>('#cancel-send-button')! }
    static get blockstackAccountNavbar() { return document.querySelector<HTMLButtonElement>('#blockstack-account-navbar')! }
    static get signOutButton() { return document.querySelector<HTMLButtonElement>('#blockstack-account-sign-out')! }
    static get loginPage() { return document.querySelector<HTMLButtonElement>('#login-page')! }
    static get loginButton() { return document.querySelector<HTMLButtonElement>('#login-button')! }
    static get walletInfoDisplay() { return document.querySelector<HTMLElement>('#wallet-info-display')! }
    static get transactionsPage() { return document.querySelector<HTMLElement>('#transactions-page')! }
    static get sendMoneroPage() { return document.querySelector<HTMLElement>('#send-monero-page')! }
}

const hideClass = "d-none";
function hideElement(...elements: HTMLElement[]) {
    elements.forEach(el => {
        if (!el.classList.contains(hideClass)) {
            el.classList.add(hideClass)
        }
    });
}
function showElement(...elements: HTMLElement[]) {
    elements.forEach(el => {
        if (el.classList.contains(hideClass)){
            el.classList.remove(hideClass);
        }
    });
}


export class NavigationViewModel {

    static instance : NavigationViewModel;

    static initialize() {
        if (!this.instance) {
            this.instance = new NavigationViewModel();
        }
    }

    constructor() {
        View.sendMoneroPageButton.addEventListener("click", () => this.showSendMoneroPage());
        View.cancelSendButton.addEventListener("click", () => this.showTransactionsPage());
    }

    // Switch from "send transaction" page to "transaction list" page.
    showTransactionsPage() {
        hideElement(View.sendMoneroPage);
        showElement(View.transactionsPage);
    }

    // Switch from "transaction list" page to "send transaction" page.
    showSendMoneroPage() {
        hideElement(View.transactionsPage);
        showElement(View.sendMoneroPage);
    }

    showAlert(title: string, message: string) {
        (window as any).alertify.alert(title, message);
    }

    showErrorNotification(err) {
        (window as any).alertify.error(err.message || err);
    }

    showSuccessNotification(message: string) {
        (window as any).alertify.success(message);
    }

    setDisplayForSignedIn(isSignedIn: boolean) {
        if (isSignedIn) {
            // Hide the sign in page.
            hideElement(View.loginPage);

            // Show the wallet and transaction displays.
            showElement(
                View.blockstackAccountNavbar,
                View.walletInfoDisplay
            );
            this.showTransactionsPage();
        }
        else {
            // Hide the wallet and account displays.
            hideElement(
                View.blockstackAccountNavbar,
                View.walletInfoDisplay,
                View.transactionsPage,
                View.sendMoneroPage
            );

            // Show the sign in page.
            showElement(View.loginPage);
        }
    }

    async waitForLoginClick() {
        return new Promise(res => View.loginButton.addEventListener('click', () => res(), { once: true }));
    }

    async waitForLogoutClick() {
        return new Promise(res => View.signOutButton.addEventListener('click', () => res(), { once: true }));
    }

}