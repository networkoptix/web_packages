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
    bind = 'bind',
}
