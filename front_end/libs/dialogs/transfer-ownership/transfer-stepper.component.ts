import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { Component, HostBinding } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'nx-transfer-stepper',
    template: `<ng-container [ngTemplateOutlet]="selected!.content"></ng-container>`,
    styles: `
        :host {
            height: 300px;
        }
    `,
    providers: [{ provide: CdkStepper, useExisting: NxTransferStepperComponent }],
    standalone: true,
    imports: [CommonModule, CdkStepperModule, TranslateModule],
})
export class NxTransferStepperComponent extends CdkStepper {
    @HostBinding('class.nx-modal__content') content = true;
}
