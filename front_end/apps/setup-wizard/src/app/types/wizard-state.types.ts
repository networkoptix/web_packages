export const enum WIZARD_STATE {
    Advanced = 'advanced',
    BrokenSystem = 'brokenSystem',
    ChooseCloudOrLocal = 'chooseCloudOrLocal',
    CloudLogin = 'cloudLogin',
    CloudProcess = 'cloudProcess',
    CloudSuccess = 'cloudSuccess',
    ConfigureWrongNetwork = 'configureWrongNetwork',
    InitFailure = 'initFailure',
    LocalFailure = 'localFailure',
    LocalLogin = 'localLogin',
    LocalSuccess = 'localSuccess',
    Merge = 'merge',
    MergeFailure = 'mergeFailure',
    MergeProcess = 'mergeProcess',
    NoInternetOnClient = 'noInternetOnClient',
    NoInternetOnServer = 'noInternetOnServer',
    RetryMergeCredentials = 'retryMergeCredentials',
    Start = 'start',
    SystemName = 'systemName',
}

export interface iState {
    title?: string
    back?: () => void
    cancel?: () => void
    next?: () => void
    skip?: () => void
    retry?: () => void
    jump?: () => void
    validate?: () => boolean
    finish?: boolean
}

export const enum FORM_STATE {
    INVALID = 'INVALID',
    VALID = 'VALID',
}

export const enum SECURITY_LEVEL {
    STANDARD = 'standard',
    SAFE = 'safe',
}
