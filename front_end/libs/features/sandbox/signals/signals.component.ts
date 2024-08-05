import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { map, skip, startWith, switchMap, take, timer } from 'rxjs';

import {
    bindSignals,
    paramModel,
    paramSignal,
    createBoundSignal,
    pipeSignal,
} from '@utils/signals';

import { NxNgModelComponent } from './ng-model.component';
import { RecursiveComponent } from './recursive.component';

const boundSourceSerializer = {
    serialize: (value: number) => value / 2,
    deserialize: (value: number) => value * 2,
};

@Component({
    selector: 'signals-component',
    templateUrl: 'signals.component.html',
    styleUrls: ['signals.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, RecursiveComponent, NxNgModelComponent],
})
export class NxSignalsComponent {
    modelBinding$$ = signal({ value: 'model binding' });

    modelAlias$$ = createBoundSignal(this.modelBinding$$, {
        serialize: ({ value }) => value.toLowerCase(),
        deserialize: val => ({ value: val.toUpperCase() }),
    });

    source1$$ = signal(0);
    source2$$ = signal(0);

    createBoundSource$$ = createBoundSignal(this.source2$$, boundSourceSerializer);

    paramModel$$ = paramModel('someParam');
    paramSignal$$ = paramSignal('someParam');
    paramModel2$$ = paramModel(
        'someParam',
        { value: '' },
        {
            serialize: ({ value }) => [value],
            deserialize: val => ({ value: val[0] || '' }),
        },
    );

    checkAll$$ = signal<boolean | undefined>(undefined);

    numberOfCheckboxes$$ = paramModel('numberOfCheckboxes', 4, {
        serialize: qty => [Math.max(Number.isNaN(qty) ? 4 : qty, 0).toString()],
        deserialize: val => {
            let current = 4;
            try {
                current = parseInt(val[0]);
            } catch {}

            return Math.max(current, 0);
        },
    });

    checkBoxes$$ = signal([false, false, false, false]);

    disabled$$ = signal(false);

    isTyping$$ = pipeSignal(
        this.paramModel$$,
        updates =>
            updates.pipe(
                skip(1),
                switchMap(() =>
                    timer(1000).pipe(
                        map(() => false),
                        take(1),
                        startWith(true),
                    ),
                ),
            ),
        false,
    );

    ngModelBinding = 'ngModelBinding';
    modelValueBinding = 'modelValueBinding';

    toggleCheckbox(index: number): void {
        this.checkBoxes$$.set(
            this.checkBoxes$$().map((value, i) => (i === index ? !value : value)),
        );
    }

    toggleCheckAll(): void {
        this.checkAll$$.update(val => !val);
    }

    constructor() {
        bindSignals(this.source1$$, this.source2$$, boundSourceSerializer);

        bindSignals(this.checkAll$$, this.checkBoxes$$, {
            serialize: value =>
                this.checkBoxes$$().map(current => (value === undefined ? current : value)),
            deserialize: values => {
                const allChecked = values.every(Boolean);
                const allUnchecked = values.every(v => !v);

                return [allChecked, allUnchecked].some(Boolean) ? allChecked : undefined;
            },
        });

        bindSignals(this.numberOfCheckboxes$$, this.checkBoxes$$, {
            serialize: qty => {
                const current = this.checkBoxes$$();
                const diff = qty - current.length;
                return diff > 0 ? [...current, ...Array(diff).fill(false)] : current.slice(0, qty);
            },
            deserialize: values => values.length,
        });
    }
}
