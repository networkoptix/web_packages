import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { delay, mergeMap, of, throwError, timer } from 'rxjs';

import { NxButtonComponent } from '@components/button/button.component';
import { ButtonType } from '@components/button/button.component.types';
import { NxAsyncActionButtonComponent } from '@dialogs/async-action-button/async-action-button.component';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-buttons-example',
    templateUrl: 'buttonsExample.component.html',
    styleUrls: ['buttonsExample.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
        TranslateModule,
        NxButtonComponent,
        NxAsyncActionButtonComponent,
    ],
})
export class NxButtonsExampleComponent {
    ButtonType = ButtonType;

    successAction = createAsyncAction({
        action: () => of('async action result').pipe(delay(2000)),
        success: res => {
            console.log(res);
        },
    });
    errorAction = createAsyncAction({
        action: () => timer(2000).pipe(mergeMap(_ => throwError(() => 'async action error!'))),
        success: () => {},
        error: err => {
            console.log('async error caught:', err);
        },
    });

    onClick(): void {
        console.log('Example button clicked!');
    }

    protected readonly icons = icons;
}
