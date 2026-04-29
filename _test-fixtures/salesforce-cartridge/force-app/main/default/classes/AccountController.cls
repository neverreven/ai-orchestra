// ai-orchestra fixture: minimal Apex controller. Not compiled.
// Triggers the salesforce-apex.mdc rule via the *.cls file glob.
public with sharing class AccountController {
    @AuraEnabled(cacheable=true)
    public static List<Account> getRecentAccounts(Integer recordLimit) {
        return [
            SELECT Id, Name
            FROM Account
            WITH USER_MODE
            ORDER BY LastModifiedDate DESC
            LIMIT :recordLimit
        ];
    }
}
