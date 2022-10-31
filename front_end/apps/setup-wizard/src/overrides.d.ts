declare global {
    interface Window {
        nativeClient: typeof nativeClient;
    }

    class nativeClient {
        static cancel(): void;
        static connectUsingLocalAdmin(password: string, savePassword: boolean): void;
        static refreshToken(): string;
        static openUrlInBrowser(url: string): void;
    }
}

export {};
