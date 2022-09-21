export const success1 = `
class Foo {
    bar() {
        const href = this.window.location.href;
    }
}`;
export const success2 = `
class Foo {
    constructor(window: Window) {}

    foo(window);
    foo(window) {
        function foo(window);
        function foo(window) {}

        const foo = window => {};
    }

    foo = window => {}
}`;
export const success3 = `
class Foo {
    bar() {
        interface window extends window {}
        interface window {}
        type window = null;
        type foo = window & null;
        function foo(bar: window): window {}
    }
}`;
export const success4 = `
class Foo {
    window() {}
}`;
export const success5 = `
class Foo {
    bar() {
        const [window] = [1];
    }
}`;
export const success51 = `
class Foo {
    bar() {
        const [foo, ...window] = [];
        const { foo, ...window } = {};
        function foo(...window) {}
    }
}`;
export const success6 = `
class Foo {
    window = null;
}`;
export const success7 = `
class Foo {
    bar() {
        const window = 1;
    }
}`;
export const success8 = `
class Foo {
    bar() {
        const { window } = {};
        const foo = { window: 1 };
    }
}`;
export const success9 = `
class Foo {
    bar(window) {
        window.fizz();
    }
}`;
export const success10 = `
class Foo {
    bar() {
        const window = null;
        const buzz = window.buzz;
    }
}`;
export const success11 = `
class Foo {
    bar() {
        const window = null;
        if (true) {
            const bar = () => {
                const two = window.increment();
            }
        }
    }
}`;

export const fail1a = `
class Foo {
    constructor(@Inject(WINDOW) private window: Window) {}

    bar() {
        const href = window.location.href;
    }
}`;
export const fail1b = `
class Foo {
    constructor(@Inject(WINDOW) private window: Window) {}

    bar() {
        const href = this.window.location.href;
    }
}`;
export const fail2 = `
class Foo {
    bar() {
        const href = window.location.href;
    }
}`;

export const fail3a = `
class Foo {
    constructor(@Inject(WINDOW) private window: Window) {}

    bar() {
        const href = window.location.href;
        const window = null;
        const fizz = window.buzz;
    }
}`;
export const fail3b = `
class Foo {
    constructor(@Inject(WINDOW) private window: Window) {}

    bar() {
        const href = this.window.location.href;
        const window = null;
        const fizz = window.buzz;
    }
}`;
export const fail4 = `
class Foo {
    constructor(private window: Window) {}
    bar() {
        const href = window.location.href;
    }
}`;
