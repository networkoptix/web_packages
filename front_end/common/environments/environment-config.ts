export interface IEnvironment {
    readonly isLocal: boolean;
    readonly isSetup?: boolean;
    readonly production: boolean;
    readonly cloudHost?: string;
    readonly cloudHostDev?: string
}
