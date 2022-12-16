export enum TfaAction {
    Enable,
    Disable,
    CodeOnLoginEnable,
    CodeOnLoginDisable,
    PasswordChange,
    NewBackupCodes,
}

export enum T_FA_STEPS {
    ChangePassword,
    Code,
    WizardLogin,
    WizardQR,
    WizardCode,
    WizardFinish,
    VerificationToggle,
    Disable2FaCode
}
