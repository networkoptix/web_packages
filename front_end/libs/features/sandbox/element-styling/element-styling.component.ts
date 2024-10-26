import { Component } from '@angular/core';

import { NxLabelComponent } from '@components/forms/label/label.component';

@Component({
    selector: 'lib-element-styling',
    standalone: true,
    imports: [NxLabelComponent],
    templateUrl: './element-styling.component.html',
    styleUrl: './element-styling.component.scss',
})
export class NxElementStylingSandboxComponent {}
