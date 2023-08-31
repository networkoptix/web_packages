/**
 * A helper function to setup text within the OAuth app
 */
import staticLang from '@language_static';

export interface TemplateText {
    [clientType: string]: {
        header: string;
        subHeader?: string | undefined;
        subHeaderSuffix?: string | undefined;
    };
}

export function setupText(type?: string): TemplateText {
    const auth = staticLang.authorize;
    const subHeader = auth.asAccountSubheader;

    const connect = {
        header: auth.connectHeader,
        subHeader: auth.toAccountSubheader,
    };
    const renew = {
        header: auth.expiredHeader,
        subHeader: auth.expiredAccountSubheader,
    };
    const login = {
        header: auth.loginCloudHeader,
        subHeader,
    };

    if (type === 'email') {
        connect.subHeader = auth.connectSubheader;
        renew.subHeader = auth.expiredSubheader;
        delete login.subHeader;
    }

    return {
        loginToCloud: login,
        loginToWebadmin: login,
        system2faAuth: login,
        confirmPasswordApplyChanges: {
            header: auth.loginCloudHeader,
            subHeader,
            subHeaderSuffix: auth.passwordApply,
        },
        confirmPasswordDisconnect: {
            header: auth.loginCloudHeader,
            subHeader,
            subHeaderSuffix: auth.passwordDisconnect,
        },
        confirmPasswordMerge: {
            header: auth.loginCloudHeader,
            subHeader,
            subHeaderSuffix: auth.passwordMerge,
        },
        confirmPasswordCreateBackup: {
            header: auth.loginCloudHeader,
            subHeader,
            subHeaderSuffix: auth.passwordBackup,
        },
        confirmPasswordRestoreBackup: {
            header: auth.loginCloudHeader,
            subHeader,
            subHeaderSuffix: auth.passwordRestore,
        },
        confirmPasswordResetServer: {
            header: auth.loginCloudHeader,
            subHeader,
            subHeaderSuffix: auth.passwordReset,
        },
        confirmPasswordRestartServer: {
            header: auth.loginCloudHeader,
            subHeader,
            subHeaderSuffix: auth.passwordRestart,
        },
        confirmPasswordDetachServer: {
            header: auth.loginCloudHeader,
            subHeader,
            subHeaderSuffix: auth.passwordDetach,
        },
        confirmPasswordTransfer: {
            header: auth.loginCloudHeader,
            subHeader,
            subHeaderSuffix: auth.passwordTransfer,
        },
        connectSystemToCloud: connect,
        setupWizard: connect,
        renewSessionDesktop: renew,
        renewSessionWeb: renew,
    };
}
