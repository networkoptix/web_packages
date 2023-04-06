import { Component } from '@angular/core';
import type { TranslateService } from '@ngx-translate/core';

import { htmlStrConstructor } from '@utils/nx';

@Component({
    standalone: true,
    selector: '_nx-test-box',
    template: '<h1>Temporary testing page</h1>',
})
export class _NxTestBoxComponent {}

/* This is a dumb hack to do some testing while unit tests are down */

class TranslateMock {
    instant(key: string, interpolateParams?: Record<string, unknown>): string {
        if (!interpolateParams) {
            return key;
        } else {
            return `"${key}" | ${JSON.stringify(interpolateParams)}`;
        }
    }
}

const TranslateServiceMock = new TranslateMock() as TranslateService;

function testEqual<T>(result: T, expected: T): void {
    if (result === expected) {
        console.log('✔️ Test passed for');
        console.log(result);
    } else {
        console.log('❌ Test failed');
        console.log(result);
        console.log('was not equal to');
        console.log(expected);
    }
}

const result1 = htmlStrConstructor([
    { name: 'p', children: ['Action failed.'] },
    { name: 'p', children: ['Please reconnect.'] },
]);
const expected1 = `
<p>Action failed.</p>
<p>Please reconnect.</p>
`.trim();
testEqual(result1, expected1);

const result2 = htmlStrConstructor(
    [
        { name: 'p', children: [{ value: 'Action failed.' }] },
        { name: 'p', children: [{ value: 'Please reconnect.' }] },
    ],
    TranslateServiceMock,
);
const expected2 = `
<p>Action failed.</p>
<p>Please reconnect.</p>
`.trim();
testEqual(result2, expected2);
