export enum logoAreaState {
    SYSTEM = 'system',
    SYSTEMS = 'systems',
    LOGO = 'logo',
    MOBILE_OPEN = 'mobileMenu',
    PROFILE_OPEN = 'mobileProfile'
}

export enum mobileIconState {
    CREATE_ACCOUNT = 'createAccount',
    RETURN_TO_SYSTEMS = 'returnToSystems',
    RETURN = 'return',
    PROFILE = 'profile',
    NONE = 'none'
}

export type logoClickType = 'system' | 'systems-list';
