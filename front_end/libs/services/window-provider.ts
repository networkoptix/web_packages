import { FactoryProvider, InjectionToken } from '@angular/core';

// global window type is not Window, but Window & typeof globalThis
// Most of the time just "Window" is ok, but sometimes "& typeof globalThis"
// will be required
export const WINDOW = new InjectionToken<Window & typeof globalThis>('window');

export const windowFactory = (): Window & typeof globalThis => window;

export const windowProvider: FactoryProvider = {
    provide: WINDOW,
    useFactory: windowFactory,
};

export const WINDOWS_PROVIDERS = [windowProvider];
