import { CdkStepper } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
    selector: 'nx-information-stepper',
    template: `<ng-container [ngTemplateOutlet]="selected!.content"></ng-container>`,
    providers: [{ provide: CdkStepper, useExisting: NxInformationStepperComponent }],
    standalone: true,
    imports: [CommonModule],
})
export class NxInformationStepperComponent extends CdkStepper {}
