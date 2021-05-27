import { isDevMode } from '@angular/core';

export function LoggerDecorator (prefix: string = '', disable: boolean = false) {
    return function <T extends { new(...args: any[]): {} }>(constructor: T) {
        return class extends constructor {
            protected _log (...args: any[]) {
                if (isDevMode() && !disable) {
                    console.log.apply(console, [prefix, ...arguments]);
                }
            }

            protected _warn (...args: any[]) {
                if (isDevMode() && !disable) {
                    console.warn.apply(console, [prefix, ...arguments]);
                }
            }
        };
    };
}

export default LoggerDecorator;

/*
Usage:

@LoggerDecorator('COMPONENT PREFIX ::', true*) // * — optional, false by default
class YourClass {
    // add these two lines, otherwise the linter will be spitting numerous curses
    _log: Function;
    _warn: Function;

 */
