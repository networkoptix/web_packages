export const State: {
    [state: string]: {
        show: any,
        showUpdates: any,
        template: any,
        errorText: Partial<ErrorText>
    }
} = Object.assign({
    thisSystemHasOutdatedServerError : { show: {}, showUpdates: {}, template: {}, errorText: {} },
    checkMerge                       : {
        show: {
            systemDropdown                    : true,
            helpText                          : true,
            serverUrlInput                    : false,
            serverUrlInputValidationErrorText : false,
            checkingErrorText                 : false
        },
        showUpdates: {
            checkMergeDefault: {
                systemDropdown : true,
                helpText       : true
            },
            checkMergeError: {
                systemDropdown    : true,
                checkingErrorText : true
            },
            serverUrl: {
                systemDropdown : true,
                serverUrlInput : true
            },
            serverUrlValidationError: {
                systemDropdown                    : true,
                serverUrlInput                    : true,
                serverUrlInputValidationErrorText : true
            },
            serverUrlMergeError: {
                systemDropdown    : true,
                serverUrlInput    : true,
                checkingErrorText : true
            },
            noOtherSystemServerUrl: {
                serverUrlInput: true
            },
            noOtherSystemValidationError: {
                serverUrlInput                    : true,
                serverUrlInputValidationErrorText : true
            },
            noOtherSystemMergeError: {
                serverUrlInput    : true,
                checkingErrorText : true
            }
        },
        template: {
            bodyTitle                         : '',
            checkingErrorText                 : '',
            helpText                          : '',
            selectedTarget                    : '',
            serverUrlInputValue               : '',
            serverUrlInputValidationErrorText : ''
        },
        errorText: {
            duplicateServers           : '',
            noServerFound              : '',
            primarySystemOffline       : '',
            primarySystemUnavailable   : '',
            secondaryCannotMerge       : '',
            secondarySystemUnavailable : '',
            serverNotAvailable         : '',
            serverNotYours             : '',
            systemOffline              : '',
            systemsIncompatible        : '',
            systemVersionOld           : '',
            systemVersionNew           : '',
            unknownError               : '',
            urlEmpty                   : '',
            urlNotValid                : ''
        }
    },
    adminPassword: {
        show        : { passwordError: false },
        showUpdates : {
            default              : { passwordError: false },
            confirmPasswordError : { passwordError: true }
        },
        template: {
            passwordErrorText : '',
            passwordValue     : ''
        },
        errorText: {
            passwordRequired : '',
            passwordWrong    : '',
            unknownError     : ''
        }
    },
    serverUrlErrors: {
        show        : {},
        showUpdates : { serverUrlErrors: {} },
        template    : {
            urlErrorText: ''
        },
        errorText: {
            differentOwners    : '',
            duplicateServers   : '',
            serverNotAvailable : '',
            systemOfflineUrl   : '',
            unknownError       : ''
        }
    },
    choosePrimary : { show: {}, showUpdates: {}, template: {}, errorText: {} },
    confirmMerge  : {
        show        : { passwordError: false },
        showUpdates : {
            default              : { passwordError: false },
            confirmPasswordError : { passwordError: true }
        },
        template: {
            passwordErrorText : '',
            passwordValue     : ''
        },
        errorText: {
            adminPasswordWrong : '',
            passwordRequired   : '',
            passwordWrong      : '',
            unknownError       : ''
        }
    }
});

export interface ErrorText {
    adminPasswordWrong : string,
    differentOwners : string,
    duplicateServers : string,
    noServerFound : string,
    passwordRequired : string,
    passwordWrong : string,
    primarySystemOffline : string,
    primarySystemUnavailable : string,
    secondaryCannotMerge : string,
    secondarySystemUnavailable : string,
    serverNotAvailable : string,
    serverNotYours : string,
    systemOffline : string,
    systemOfflineUrl : string,
    systemsIncompatible : string,
    systemVersionOld : string,
    systemVersionNew : string,
    unknownError : string,
    urlEmpty : string,
    urlNotValid : string,
};
