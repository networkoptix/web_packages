export default Object.assign({
    thisSystemHasOutdatedServerError : { show: {}, template: {}, errorText: {} },
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
            serverVersionOld           : '',
            serverVersionNew           : '',
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
    choosePrimary : { show: {}, template: {}, errorText: {} },
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
            passwordRequired : '',
            passwordWrong    : '',
            unknownError     : ''
        }
    }
});
