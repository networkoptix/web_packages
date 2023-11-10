import { CloudBindData } from './app/types/cloud-bind.types';

declare global {
    interface Window {
        nativeClient: typeof nativeClient;
    }

    class nativeClient {
        static twoFaVerified(code: string): void;
        static openUrlInBrowser(url: string): void;
        static setCode(code: string): void;
        static username(): Promise<string>;
        static setBindInfo(bindInfo: CloudBindData): void;
    }
}

export {};
