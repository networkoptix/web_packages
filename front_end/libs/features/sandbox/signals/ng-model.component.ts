import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NgModelSignalDirective } from './ng-model-signal.directive';

@Component({
    selector: 'nx-ng-model',
    standalone: true,
    imports: [FormsModule],
    hostDirectives: [NgModelSignalDirective],
    template: `
        <label>
            NgModel:
            {{ ngModelSignal.dirty$$() ? 'Value modified by directive' : 'Value from parent' }}

            <input
                [ngModel]="ngModelSignal.value$$()"
                (ngModelChange)="ngModelSignal.value$$.set($event)"
                [disabled]="ngModelSignal.disabled$$()"
            />
            @if (ngModelSignal.dirty$$()) {
                <button (click)="ngModelSignal.reset()">Reset</button>
            }
        </label>
    `,
})
export class NxNgModelComponent {
    ngModelSignal = NgModelSignalDirective.inject('');
}
