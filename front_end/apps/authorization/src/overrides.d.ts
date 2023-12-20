import { CloudBindData } from './app/types/cloud-bind.types';
import { CloudTokens } from './app/types/bind-service.types';

declare global {
    interface Window {
        nativeClient: typeof nativeClient;
    }

    class nativeClient {
        static setTokens(tokens: CloudTokens): void;
        static twoFaVerified(code: string): void;
        static openUrlInBrowser(url: string): void;
        static setCode(code: string): void;
        static username(): Promise<string>;
        static setBindInfo(bindInfo: CloudBindData): void;
    }
}

export {};
