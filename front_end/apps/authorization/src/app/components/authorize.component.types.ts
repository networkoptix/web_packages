export interface AuthorizeParams {
    response_type: string;
    client_id: string;
    redirect_uri?: string;
    redirect_url?: string;
    client_type?: ClientType;
    view_type?: 'desktop' | 'mobile' | 'web';
    grant_type?: string;
    scope?: string;
    state?: string;
    code?: string;
    message?: 'passwordReset' | 'activated';
    email?: string;
    access_code?: string;
    access_token?: string;
    lang?: string;
}

export type AuthorizeStateType =
    | 'email'
    | 'password'
    | 'create'
    | 'activate'
    | 'confirm'
    | 'request'
    | 'reset'
    | 'error'
    | 'auth'
    | 'backup'
    | 'notSecure';

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
    notSecure = 'notSecure',
    show404 = 'show404',
}

export enum ClientType {
    loginCloud = 'loginToCloud',
    loginWebadmin = 'loginToWebadmin',
    passwordApply = 'confirmPasswordApplyChanges',
    passwordDisconnect = 'confirmPasswordDisconnect',
    passwordMerge = 'confirmPasswordMerge',
    passwordBackup = 'confirmPasswordCreateBackup',
    passwordRestore = 'confirmPasswordRestoreBackup',
    passwordReset = 'confirmPasswordResetServer',
    passwordRestart = 'confirmPasswordRestartServer',
    passwordDetach = 'confirmPasswordDetachServer',
    passwordTransfer = 'confirmPasswordTransfer',
    create = 'createAccount',
    connect = 'connectSystemToCloud',
    setup = 'setupWizard',
    renewDesktop = 'renewSessionDesktop',
    renewWeb = 'renewSessionWeb',
    renewWeb2FA = 'renewSessionWeb2FA',
    openClient = 'openClientFromCloud',
    system2faAuth = 'system2faAuth',
}

export interface AuthenticateResp {
    code?: string;
    link?: string;
}
