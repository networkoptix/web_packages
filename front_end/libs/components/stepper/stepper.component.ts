import { CdkStepper } from '@angular/cdk/stepper';
import { Component, Input, TemplateRef } from '@angular/core';

@Component({
    selector: 'nx-stepper',
    templateUrl: './stepper.component.html',
    styleUrls: ['./stepper.component.scss'],
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    providers: [{ provide: CdkStepper, useExisting: NxStepperComponent }],
})
export class NxStepperComponent extends CdkStepper {
    @Input() customButtonLabels: string[];
    // Can't use unknown here because templateRef is used with else
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Input() saveButton: TemplateRef<any>;
    @Input() columns: number = 4;
    @Input() controlledSteps: boolean = false;
}
