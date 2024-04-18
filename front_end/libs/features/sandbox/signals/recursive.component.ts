import { CommonModule } from '@angular/common';
import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { createBoundSignal } from '@utils/signals';

const boundSourceSerializer = {
    serialize: (value: number) => value / 2,
    deserialize: (value: number) => value * 2,
};

@Component({
    standalone: true,
    selector: 'recursive-component',
    imports: [CommonModule, FormsModule],
    template: `
        <label>
            Child levels: {{ children$$() }}
            <input
                type="number"
                [ngModel]="modelAlias$$()"
                (ngModelChange)="modelAlias$$.set($event)"
            />
        </label>
        @if (children$$() > 0) {
            <recursive-component
                [children]="children$$() - 1"
                [(modelBinding)]="modelAlias$$"
            ></recursive-component>
        }
    `,
})
export class RecursiveComponent {
    children$$ = input<number>(0, { alias: 'children' });
    modelBinding$$ = model<number>(0, { alias: 'modelBinding' });
    // Mapped model example
    modelAlias$$ = createBoundSignal(this.modelBinding$$, boundSourceSerializer);
}
