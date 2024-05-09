import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
    selector: 'nx-add-org-user-stepper',
    template: '<ng-container [ngTemplateOutlet]="selected!.content"></ng-container>',
    providers: [{ provide: CdkStepper, useExisting: NxAddOrgUserStepperComponent }],
    standalone: true,
    imports: [CommonModule, CdkStepperModule],
})
export class NxAddOrgUserStepperComponent extends CdkStepper {}
