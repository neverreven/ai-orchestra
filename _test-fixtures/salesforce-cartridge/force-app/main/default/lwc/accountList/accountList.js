// ai-orchestra fixture: minimal Lightning Web Component. Not compiled.
// Triggers the salesforce-lwc.mdc rule via the lwc/<name>/<name>.js path.
import { LightningElement, wire } from 'lwc';
import getRecentAccounts from '@salesforce/apex/AccountController.getRecentAccounts';

export default class AccountList extends LightningElement {
  @wire(getRecentAccounts, { recordLimit: 10 })
  accounts;
}
