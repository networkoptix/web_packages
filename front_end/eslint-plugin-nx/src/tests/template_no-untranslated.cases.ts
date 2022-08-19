export const fail1a = `
<div
    foo
    bar
>
    baz
</div>`;
export const fail1b = `
<div
    foo
    bar
    translate
>
    baz
</div>`;

export const fail2a = `
<span
    foo
    bar
    >baz</span
>`;
export const fail2b = `
<span
    foo
    bar
    translate
    >baz</span
>`;

export const fail3a = `
<div
    foo
    bar
>
    <div
        foo
        bar
    >
        baz
    </div>
</div>`;
export const fail3b = `
<div
    foo
    bar
>
    <div
        foo
        bar
        translate
    >
        baz
    </div>
</div>`;
