import { CdkStepper, CdkStepperModule } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'nx-transfer-stepper',
    templateUrl: './transfer-stepper.component.html',
    styleUrls: ['./transfer-stepper.component.scss'],
    providers: [{ provide: CdkStepper, useExisting: NxTransferStepperComponent }],
    standalone: true,
    imports: [CommonModule, CdkStepperModule, TranslateModule],
})
export class NxTransferStepperComponent extends CdkStepper {}
