interface credentials {
    email: string;
    accessToken: string;
}

declare global {
    interface Window {
        nativeClient: nativeClient;
    }

    class nativeClient {
        static cancelDialog(): void;
        static closeDialog(): void;
        getCredentials(): credentials;
        static init(): Promise<void>;
        static twoFaVerified(code: string): void;
        static openUrlInBrowser(url: string): void;
        static setCode(code: string): void;
    }
}

export {};
