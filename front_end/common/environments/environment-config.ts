export interface IEnvironment {
    readonly isLocal: boolean;
    readonly isSetup?: boolean;
    readonly production: boolean;
    readonly cloudHost?: string;
    readonly cloudHostDev?: string;
    readonly setupUrl?: string;
    readonly isWizard?: boolean;
    readonly testing?: boolean;
}

export let testing = false;

try {
    testing = process.env.JEST_WORKER_ID !== undefined
} catch(_) {}
