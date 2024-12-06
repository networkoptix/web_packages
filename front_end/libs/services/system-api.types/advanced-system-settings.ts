export type SystemManifestSetting = {
    isOwnerOnly: boolean;
    isReadOnly: boolean;
    isSecurity: boolean;
    isWriteOnly: boolean;
    label: string;
    type: 'boolean' | 'number' | 'string' | 'object';
};

export type Manifest = Record<string, SystemManifestSetting>;
