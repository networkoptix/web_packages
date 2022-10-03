import { CdkStepper } from '@angular/cdk/stepper';
import { Component, Input, TemplateRef } from '@angular/core';

@Component({
    selector: 'nx-stepper',
    templateUrl: './stepper.component.html',
    styleUrls: ['./stepper.component.scss'],
    // eslint-disable-next-line no-use-before-define
    providers: [{ provide: CdkStepper, useExisting: NxStepperComponent }]
})
export class NxStepperComponent extends CdkStepper {
    @Input() customButtonLabels: string[];
    @Input() saveButton: TemplateRef<any>;
    @Input() columns = 4;
    @Input() controlledSteps = false;
}
