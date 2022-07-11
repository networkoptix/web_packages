export interface AuthorizeParams {
    response_type: string,
    client_id: string,
    redirect_uri?: string,
    redirect_url?: string,
    client_type?: ClientType,
    view_type?: 'desktop' | 'mobile' | 'web',
    grant_type?: string,
    scope?: string,
    state?: string,
    code?: string,
    message?: 'passwordReset' | 'activated',
    email?: string,
    access_code?: string,
    access_token?: string
}

export type AuthorizeStateType = 'email' |
    'password' |
    'create' |
    'activate' |
    'confirm' |
    'request' |
    'reset' |
    'error' |
    'auth' |
    'backup' |
    'notSecure';

export enum AuthorizeState {
    email = 'email',
    password = 'password',
    create = 'createAccount',
    activate = 'activateAccount',
    confirm = 'confirmation',
    request = 'resetPasswordRequest',
    reset = 'resetPassword',
    error = 'error',
    auth = 'authCode',
    backup = 'backupCode',
    notSecure = 'notSecure'
}

export enum ClientType {
    loginCloud = 'loginToCloud',
    loginWebadmin = 'loginToWebadmin',
    passwordDisconnect = 'confirmPasswordDisconnect',
    passwordMerge = 'confirmPasswordMerge',
    passwordBackup = 'confirmPasswordCreateBackup',
    passwordRestore = 'confirmPasswordRestoreBackup',
    passwordReset = 'confirmPasswordResetServer',
    passwordRestart = 'confirmPasswordRestartServer',
    passwordDetach = 'confirmPasswordDetachServer',
    create = 'createAccount',
    connect = 'connectSystemToCloud',
    setup = 'setupWizard',
    renewDesktop = 'renewSessionDesktop',
    renewWeb = 'renewSessionWeb',
    openClient = 'openClientFromCloud',
    system2faAuth = 'system2faAuth',
}
