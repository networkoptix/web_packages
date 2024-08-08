import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    Output,
    effect,
    input,
    signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LetDirective } from '@ngrx/component';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { NxButtonToggleModule } from '@components/button-toggle/button-toggle.module';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxApplyV3Module } from '@components/forms/apply-v3/apply-v3.module';
import { NxFormFieldComponent } from '@components/forms/form-field/form-field.component';
import { AsyncAction } from '@dialogs/async-action-button/create-async-action';
import LANG from '@language_static';
import { State } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';
import { formControlValueSignal } from '@utils/nx';

@Component({
    selector: 'nx-state-setting-block',
    templateUrl: 'state-setting-block.component.html',
    styleUrls: ['state-setting-block.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,

        AngularSvgIconModule,
        LetDirective,
        NgxTranslateCutModule,
        TranslateModule,

        NxContentBlockComponent,
        NxButtonToggleModule,
        NxFormFieldComponent,
        NxApplyV3Module,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxStateSettingBlockComponent<T> implements OnInit {
    LANG = LANG;
    icons = icons;
    State = State;

    private stateControl = new FormControl<State>(State.Active, { nonNullable: true });
    selectedState = formControlValueSignal(this.stateControl);
    stateFormGroup = new FormGroup({ state: this.stateControl });

    initialFormValue = signal<(typeof this.stateFormGroup)['value']>({ state: State.Active });

    stateInput = input.required<State>({ alias: 'state' });
    protected _inputToControlEffect = effect(
        () => {
            this.stateControl.setValue(this.stateInput());
        },
        { allowSignalWrites: true },
    );
    @Output() onStateChange = this.stateControl.valueChanges;
    inheritedState = input.required<boolean>();
    saveStateAction = input.required<AsyncAction<T>>();

    ngOnInit(): void {
        this.initialFormValue.set({ state: this.stateInput() });
    }
}
