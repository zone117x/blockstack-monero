

/** Getters for the various page navigation related DOM elements. */
class View {
    static get sendMoneroPageButton() { return document.querySelector<HTMLButtonElement>('#send-monero-page-button')! }
    static get cancelSendButton() { return document.querySelector<HTMLButtonElement>('#cancel-send-button')! }
    static get transactionsPage() { return document.querySelector<HTMLElement>('#transactions-page')! }
    static get sendMoneroPage() { return document.querySelector<HTMLElement>('#send-monero-page')! }
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

    hideAllPages(){
        View.sendMoneroPage.style.display = "none";
        View.transactionsPage.style.display = "none";
    }

    showTransactionsPage() {
        this.hideAllPages();
        View.transactionsPage.style.display = "block";
    }

    showSendMoneroPage() {
        this.hideAllPages();
        View.sendMoneroPage.style.display = "block";
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


}