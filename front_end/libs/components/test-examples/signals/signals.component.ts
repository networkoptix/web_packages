import { Component } from '@angular/core';

import { SignalsServiceExample } from '@services/test-examples/signals/signals.service';

@Component({
    template: `
        <div id="state">{{ state$$() }}</div>
        <div id="computed">{{ computed$$() }}</div>
        <div id="sideEffect">{{ sideEffect }}</div>
    `,
})
export class SignalsComponentExample extends SignalsServiceExample {}
