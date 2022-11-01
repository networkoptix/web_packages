declare global {
    interface Window {
        nativeClient: unknown;
    }

    class nativeClient {
        static twoFaVerified(code: string): void;
        static openUrlInBrowser(url: string): void;
        static setCode(code: string): void;
    }
}

export {};
