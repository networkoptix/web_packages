import { SystemVersion } from './system-version';

export interface SystemVersionBase<T = SystemVersion> {
    readonly version: T;
}

export interface SupportedVersionsBase {
    readonly supportedVersions: readonly SystemVersion[];
}

export interface StaticModule {
    moduleSymbol: symbol;
}
