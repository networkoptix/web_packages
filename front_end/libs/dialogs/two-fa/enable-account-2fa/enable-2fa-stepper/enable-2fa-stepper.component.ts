import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'nx-enable-2fa-stepper',
    templateUrl: 'enable-2fa-stepper.component.html',
    styleUrls: ['enable-2fa-stepper.component.scss'],
    standalone: true,
    imports: [CommonModule, CdkStepperModule, TranslateModule],
    providers: [{ provide: CdkStepper, useExisting: NxEnable2faStepperComponent }],
})
export class NxEnable2faStepperComponent extends CdkStepper {}
