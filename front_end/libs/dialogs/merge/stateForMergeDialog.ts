import type staticLang from '@language_static';

export const State: {
    [state: string]: {
        show: any;
        showUpdates: any;
        template: any;
        errorText: Partial<typeof staticLang.dialogs.merge>;
    };
} = Object.assign({
    thisSystemHasOutdatedServerError: { show: {}, showUpdates: {}, template: {}, errorText: {} },
    failedToFindAnySystem: { show: {}, showUpdates: {}, template: {}, errorText: {} },
    checkMerge: {
        show: {
            systemDropdown: true,
            helpText: true,
            serverUrlInput: false,
            serverUrlInputValidationErrorText: false,
            checkingErrorText: false,
        },
        showUpdates: {
            checkMergeDefault: {
                systemDropdown: true,
                helpText: true,
            },
            checkMergeError: {
                systemDropdown: true,
                checkingErrorText: true,
            },
            serverUrl: {
                systemDropdown: true,
                serverUrlInput: true,
            },
            serverUrlValidationError: {
                systemDropdown: true,
                serverUrlInput: true,
                serverUrlInputValidationErrorText: true,
            },
            serverUrlMergeError: {
                systemDropdown: true,
                serverUrlInput: true,
                checkingErrorText: true,
            },
            noOtherSystemServerUrl: {
                serverUrlInput: true,
            },
            noOtherSystemValidationError: {
                serverUrlInput: true,
                serverUrlInputValidationErrorText: true,
            },
            noOtherSystemMergeError: {
                serverUrlInput: true,
                checkingErrorText: true,
            },
        },
        template: {
            bodyTitle: '',
            checkingErrorText: '',
            helpText: '',
            selectedTarget: '',
            serverUrlInputValue: '',
            serverUrlInputValidationErrorText: '',
        },
        errorText: {
            knownBothSystemsConnectedToCloud: '',
            unknownBothSystemsConnectedToCloud: '',
            differentOwners: '',
            duplicateServers: '',
            noServerFound: '',
            primarySystemOffline: '',
            primarySystemUnavailable: '',
            secondaryCannotMerge: '',
            secondarySystemUnavailable: '',
            serverNotAvailable: '',
            serverNotYours: '',
            systemOffline: '',
            systemsIncompatible: '',
            systemVersionOld: '',
            systemVersionNew: '',
            targetSystemBoundToCloud: '',
            unknownError: '',
            urlEmpty: '',
            urlNotValid: '',
        },
    },
    adminPassword: {
        show: { passwordError: false },
        showUpdates: {
            default: { passwordError: false },
            confirmPasswordError: { passwordError: true },
        },
        template: {
            passwordErrorText: '',
            passwordValue: '',
        },
        errorText: {
            passwordRequired: '',
            passwordWrong: '',
            unknownError: '',
        },
    },
    serverUrlErrors: {
        show: {},
        showUpdates: { serverUrlErrors: {} },
        template: {
            urlErrorText: '',
        },
        errorText: {
            differentOwners: '',
            duplicateServers: '',
            serverNotAvailable: '',
            systemOffline: '',
            systemOfflineUrl: '',
            unknownError: '',
        },
    },
    choosePrimary: { show: {}, showUpdates: {}, template: {}, errorText: {} },
    confirmMerge: {
        show: { passwordError: false },
        showUpdates: {
            default: { passwordError: false },
            confirmPasswordError: { passwordError: true },
        },
        template: {
            passwordErrorText: '',
            passwordValue: '',
        },
        errorText: {
            adminPasswordWrong: '',
            passwordRequired: '',
            passwordWrong: '',
            unknownError: '',
        },
    },
    unmergedServers: { show: {}, showUpdates: {}, template: {}, errorText: {} },
});
