interface credentials {
    email: string;
    accessToken: string;
}

declare global {
    interface Window {
        nativeClient: nativeClient;
    }

    class nativeClient {
        static cancelDialog(): void
        static closeDialog(): void
        static getCredentials(): credentials
        static init(): Promise<void>
        static openUrlInBrowser(url: string): void;
    }
}

export {};
