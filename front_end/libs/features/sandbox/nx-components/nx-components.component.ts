import { Component } from '@angular/core';

import { NxExampleComponent } from 'nx-components';

@Component({
    standalone: true,
    imports: [NxExampleComponent],
    template: `
        <nx-example></nx-example>
        <nx-example variant="funky"></nx-example>
    `,
})
export class NxComponents {}
