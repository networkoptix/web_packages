import { CdkStepper } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
    selector: 'nx-information-v2-stepper',
    template: `<ng-container [ngTemplateOutlet]="selected!.content"></ng-container>`,
    providers: [{ provide: CdkStepper, useExisting: NxInformationV2StepperComponent }],
    standalone: true,
    imports: [CommonModule],
})
export class NxInformationV2StepperComponent extends CdkStepper {}
