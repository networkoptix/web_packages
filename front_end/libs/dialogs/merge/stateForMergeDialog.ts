export interface RESTError {
    duplicateServer: (params?: Record<string, string | number>) => string;
    useCloudMerge: (params?: Record<string, string | number>) => string;
    differentCloudOwners: (params?: Record<string, string | number>) => string;
}

export interface DialogsMerge {
    adminPasswordTitle: (params?: Record<string, string | number>) => string;
    adminPasswordWrong: (params?: Record<string, string | number>) => string;
    knownBothSystemsConnectedToCloud: (params?: Record<string, string | number>) => string;
    unknownBothSystemsConnectedToCloud: (params?: Record<string, string | number>) => string;
    check: (params?: Record<string, string | number>) => string;
    checking: (params?: Record<string, string | number>) => string;
    cloud: (params?: Record<string, string | number>) => string;
    commonText: (params?: Record<string, string | number>) => string;
    connectToCloud: (params?: Record<string, string | number>) => string;
    failedToFindAnySystemHeader: (params?: Record<string, string | number>) => string;
    failedToFindAnySystem: (params?: Record<string, string | number>) => string;
    differentOwners: (params?: Record<string, string | number>) => string;
    duplicateServers: (params?: Record<string, string | number>) => string;
    enterSystemAddressTitle: (params?: Record<string, string | number>) => string;
    latestBuild: (params?: Record<string, string | number>) => string;
    mergeConfirmation: (params?: Record<string, string | number>) => string;
    mergeFailedTitle: (params?: Record<string, string | number>) => string;
    mergeSuccess: (params?: Record<string, string | number>) => string;
    mergeSystemsTitle: (params?: Record<string, string | number>) => string;
    next: (params?: Record<string, string | number>) => string;
    noServerFound: (params?: Record<string, string | number>) => string;
    newSystemDisplayName: (params?: Record<string, string | number>) => string;
    otherSystem: (params?: Record<string, string | number>) => string;
    ownerCanMergeText: (params?: Record<string, string | number>) => string;
    passwordRequired: (params?: Record<string, string | number>) => string;
    passwordWrong: (params?: Record<string, string | number>) => string;
    primaryCannotMerge: (params?: Record<string, string | number>) => string;
    primarySystemOffline: (params?: Record<string, string | number>) => string;
    primarySystemUnavailable: (params?: Record<string, string | number>) => string;
    recommendSupport: (params?: Record<string, string | number>) => string;
    restError: RESTError;
    secondaryCannotMerge: (params?: Record<string, string | number>) => string;
    secondarySystemUnavailable: (params?: Record<string, string | number>) => string;
    serverAtUrl: (params?: Record<string, string | number>) => string;
    serverNotAvailable: (params?: Record<string, string | number>) => string;
    serverNotYours: (params?: Record<string, string | number>) => string;
    serverVersionOld: (params?: Record<string, string | number>) => string;
    serverVersionNew: (params?: Record<string, string | number>) => string;
    systemOffline: (params?: Record<string, string | number>) => string;
    systemOfflineUrl: (params?: Record<string, string | number>) => string;
    systemsIncompatible: (params?: Record<string, string | number>) => string;
    systemVersionOld: (params?: Record<string, string | number>) => string;
    systemVersionNew: (params?: Record<string, string | number>) => string;
    systemVersionsNotMatch: (params?: Record<string, string | number>) => string;
    targetSystemBoundToCloud: (params?: Record<string, string | number>) => string;
    urlEmpty: (params?: Record<string, string | number>) => string;
    urlNotValid: (params?: Record<string, string | number>) => string;
    unknownError: (params?: Record<string, string | number>) => string;
    warning: (params?: Record<string, string | number>) => string;
    update: (params?: Record<string, string | number>) => string;
}

export const State: {
    [state: string]: {
        show: any;
        showUpdates: any;
        template: any;
        errorText: Partial<DialogsMerge>;
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
            checkingErrorText: false
        },
        showUpdates: {
            checkMergeDefault: {
                systemDropdown: true,
                helpText: true
            },
            checkMergeError: {
                systemDropdown: true,
                checkingErrorText: true
            },
            serverUrl: {
                systemDropdown: true,
                serverUrlInput: true
            },
            serverUrlValidationError: {
                systemDropdown: true,
                serverUrlInput: true,
                serverUrlInputValidationErrorText: true
            },
            serverUrlMergeError: {
                systemDropdown: true,
                serverUrlInput: true,
                checkingErrorText: true
            },
            noOtherSystemServerUrl: {
                serverUrlInput: true
            },
            noOtherSystemValidationError: {
                serverUrlInput: true,
                serverUrlInputValidationErrorText: true
            },
            noOtherSystemMergeError: {
                serverUrlInput: true,
                checkingErrorText: true
            }
        },
        template: {
            bodyTitle: '',
            checkingErrorText: '',
            helpText: '',
            selectedTarget: '',
            serverUrlInputValue: '',
            serverUrlInputValidationErrorText: ''
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
            urlNotValid: ''
        }
    },
    adminPassword: {
        show: { passwordError: false },
        showUpdates: {
            default: { passwordError: false },
            confirmPasswordError: { passwordError: true }
        },
        template: {
            passwordErrorText: '',
            passwordValue: ''
        },
        errorText: {
            passwordRequired: '',
            passwordWrong: '',
            unknownError: ''
        }
    },
    serverUrlErrors: {
        show: {},
        showUpdates: { serverUrlErrors: {} },
        template: {
            urlErrorText: ''
        },
        errorText: {
            differentOwners: '',
            duplicateServers: '',
            serverNotAvailable: '',
            systemOffline: '',
            systemOfflineUrl: '',
            unknownError: ''
        }
    },
    choosePrimary: { show: {}, showUpdates: {}, template: {}, errorText: {} },
    confirmMerge: {
        show: { passwordError: false },
        showUpdates: {
            default: { passwordError: false },
            confirmPasswordError: { passwordError: true }
        },
        template: {
            passwordErrorText: '',
            passwordValue: ''
        },
        errorText: {
            adminPasswordWrong: '',
            passwordRequired: '',
            passwordWrong: '',
            unknownError: ''
        }
    }
});
