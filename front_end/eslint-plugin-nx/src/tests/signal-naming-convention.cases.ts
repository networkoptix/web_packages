export const s1 = `
import { signal, computed, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';

const count$$ = signal(0);
const doubleCount$$ = computed(() => count$$() * 2);
const converted$$ = toSignal(of(''));
const reaonlyCount$$ = count$$.asReadonly();
const assigned$$ = count$$;
let uninitialized$$: Signal<string>;
`;

export const s2 = `
import { signal } from '@angular/core';
function signalFactory() {
    return signal(0);
}
const fromFactory$$ = signalFactory();
`;

export const s3 = `
import { signal, computed, Component, input, Signal } from '@angular/core';
@Component()
class MyComponent {
    count$$ = signal(0);
    doubleCount$$ = computed(() => this.count$$() * 2);
    uninitialized$$: Signal<string>;

    // optional$$ = input();
    // required$$ = input.required();
}
`;

export const s4 = `
import { signal } from '@angular/core';
const [first$$] = [signal(0)];
const { level1: { foo$$: bar$$ } } = { level1: { foo$$: signal(0) } };
`;

export const s5 = `
import { Signal } from '@angular/core';
interface Foo {
    propSig$$: Signal<string>;
}
`;

export const f1 = `
import { signal, computed, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';

const count = signal(0);
const doubleCount = computed(() => count() * 2);
const converted = toSignal(of(''));
const reaonlyCount = count.asReadonly();
const assigned = count;
let uninitialized: Signal<string>;
`;

export const f2 = `
import { signal } from '@angular/core';
function signalFactory() {
    return signal(0);
}
const fromFactory = signalFactory();
`;

export const f3 = `
import { signal, computed, Component, input, Signal } from '@angular/core';
@Component()
class MyComponent {
    count = signal(0);
    doubleCount = computed(() => this.count() * 2);
    uninitialized: Signal<string>;

    // optional = input();
    // required = input.required();
}
`;

export const f4 = `
import { signal } from '@angular/core';
const [first] = [signal(0)];
const { level1: { foo: bar } } = { level1: { foo: signal(0) } };
`;

export const f5 = `
import { Signal } from '@angular/core';
interface Foo {
    propSig: Signal<string>;
}
`;
