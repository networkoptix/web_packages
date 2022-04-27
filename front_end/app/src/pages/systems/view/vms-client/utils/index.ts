import { isDevMode } from '@angular/core';

// see https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html
export function assertNever(x: never): never {
    throw new Error('Unexpected object: ' + x);
}

/*
Usage:

@LoggerDecorator('COMPONENT PREFIX ::', true*) // * — optional, false by default
class YourClass {
    // add these two lines, otherwise the linter will be spitting numerous curses
    _log: Function;
    _warn: Function;

 */
export function LoggerDecorator(prefix: string = '', disable: boolean = false) {
    return function <T extends { new(...args: any[]): {} }>(constructor: T) {
        return class extends constructor {
            protected _log(..._args: any[]): void {
                if (isDevMode() && !disable) {
                    // eslint-disable-next-line no-useless-call
                    console.log.apply(console, [prefix, ...arguments]);
                }
            }

            protected _warn(..._args: any[]): void {
                if (isDevMode() && !disable) {
                    // eslint-disable-next-line no-useless-call
                    console.warn.apply(console, [prefix, ...arguments]);
                }
            }
        };
    };
}

export const BASE64_SINGLE_TRANSPARENT_PIXEL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
