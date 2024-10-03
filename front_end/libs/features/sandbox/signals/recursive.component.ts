import { CommonModule } from '@angular/common';
import { Component, input, Input, Output, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

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
                [modelBinding]="modelAlias$$()"
                (modelBindingChange)="modelAlias$$.set($event)"
            ></recursive-component>
        }
    `,
})
export class RecursiveComponent {
    children$$ = input<number>(0, { alias: 'children' });
    @Input()
    set modelBinding(value: number) {
        this.modelBinding$$.set(value);
    }

    modelBinding$$ = signal<number>(0);
    @Output() modelBindingChange: Observable<number> = toObservable(this.modelBinding$$);

    // Mapped model example
    modelAlias$$ = createBoundSignal(this.modelBinding$$, boundSourceSerializer);
}
