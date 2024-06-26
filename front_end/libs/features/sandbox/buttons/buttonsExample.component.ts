import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { delay, mergeMap, of, throwError, timer } from 'rxjs';

import { NxButtonToggleModule } from '@components/button-toggle/button-toggle.module';
import { ToastType } from '@components/toast-container/toast.types';
import { NxAsyncActionButtonComponent } from '@dialogs/async-action-button/async-action-button.component';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import { NxToastService } from '@services/toast.service';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-buttons-example',
    templateUrl: 'buttonsExample.component.html',
    styleUrls: ['buttonsExample.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        NxAsyncActionButtonComponent,
        NxButtonToggleModule,
    ],
})
export class NxButtonsExampleComponent implements AfterViewInit {
    toastService = inject(NxToastService);
    hostElement = inject(ElementRef).nativeElement as HTMLElement;
    protected readonly icons = icons;

    successAction = createAsyncAction({
        action: () => of('async action result').pipe(delay(2000)),
        success: res => {
            this.toastService.notify(res, ToastType.Success);
        },
    });
    errorAction = createAsyncAction({
        action: () => timer(2000).pipe(mergeMap(_ => throwError(() => 'async action error!'))),
        success: () => {},
        error: err => {
            this.toastService.notify('async error caught: ' + err, ToastType.Danger);
        },
    });
    endlessAction = createAsyncAction({
        action: () => new Promise(() => {}),
        success: () => {},
    });

    fourDigits = '';
    fourDigitsBusy = false;
    fourDigitsAction = createAsyncAction({
        action: () => timer(1000),
        success: () => this.toastService.notify(this.fourDigits, ToastType.Info),
    });

    onClick(): void {
        console.log('Example button clicked!');
    }

    ngAfterViewInit(): void {
        this.hostElement
            .querySelectorAll<HTMLButtonElement>('.endless-action-button button')
            .forEach(elem => elem.click());
    }

    toggleControl = new FormControl<string | null>(null);
    disableToggle(): void {
        if (this.toggleControl.disabled) {
            this.toggleControl.enable();
        } else {
            this.toggleControl.disable();
        }
    }
}
