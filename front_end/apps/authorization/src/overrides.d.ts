declare global {
    interface Window {
        nativeClient: typeof nativeClient;
    }

    class nativeClient {
        static twoFaVerified(code: string): void;
        static openUrlInBrowser(url: string): void;
        static setCode(code: string): void;
    }
}

export {};
