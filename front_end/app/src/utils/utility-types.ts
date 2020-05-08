/**
 * Use this to enforce that class implementation exactly matches interface or other class.
 * 
 * Usage:
 * class Example implements Exacty<InterfaceOrClass, Example>{}
 */
export type Exactly<T, U> = { [K in keyof U]: K extends keyof T ? T[K] : never };
