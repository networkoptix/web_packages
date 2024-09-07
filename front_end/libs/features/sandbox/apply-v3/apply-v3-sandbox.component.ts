import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { switchMap, throwError, timer } from 'rxjs';

import { NxButtonToggleModule } from '@components/button-toggle/button-toggle.module';
import { BaseApplyV3Page } from '@components/forms/apply-v3/apply-v3-page';
import { NxApplyV3Module } from '@components/forms/apply-v3/apply-v3.module';
import { NxFormFieldModule } from '@components/forms/forms.module';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import { MS } from '@utils/general';

@Component({
    selector: 'nx-apply-v3-sandbox',
    templateUrl: 'apply-v3-sandbox.component.html',
    styleUrls: ['apply-v3-sandbox.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TranslateModule,

        NxFormFieldModule,
        NxButtonToggleModule,
        NxApplyV3Module,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxApplyV3SandboxComponent extends BaseApplyV3Page {
    value0 = 'foo';
    value1 = 'bar';

    timeIntervals = [3, 5, 7];
    actions = {
        success: this.timeIntervals.map(t => {
            return createAsyncAction({
                action: () => timer(t * MS.second),
                success: () => {
                    console.info(`${t} second success`);
                },
            });
        }),
        error: this.timeIntervals.map(t => {
            return createAsyncAction({
                action: () => timer(t * MS.second).pipe(switchMap(() => throwError(() => t))),
                success: () => {},
                error: () => {
                    console.error(`${t} second error`);
                },
            });
        }),
    };
    formGroups = {
        success: this.timeIntervals.map(
            () =>
                new FormGroup({
                    control: new FormControl(this.value0, { nonNullable: true }),
                }),
        ),
        error: this.timeIntervals.map(
            () =>
                new FormGroup({
                    control: new FormControl(this.value0, { nonNullable: true }),
                }),
        ),
    };

    constructor(
        private router: Router,
        private host: ElementRef<HTMLElement>,
    ) {
        super();
    }

    hasUnsavedChanges = computed<boolean>(() => !!this.applyV3Service.unsavedFormCount());

    fireActions(): void {
        this.host.nativeElement
            .querySelectorAll<HTMLButtonElement>('[nx-apply-button][type="submit"]')
            .forEach(b => b.click());
        setTimeout(() => {
            this.triggerNavigation();
        });
    }

    triggerNavigation(): void {
        this.router.navigate(['sandbox']).then(() => this.router.navigate(['sandbox', 'apply-v3']));
    }
}
