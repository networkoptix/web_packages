import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NxEmailComponent } from '@components/email-input/email.component';
import { NxPasswordComponent } from '@components/password-input/password.component';
import { NxPasswordValidationComponent } from '@components/password-input-validation/password-validation.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

@Component({
    selector: 'validation',
    templateUrl: 'validation.component.html',
    styleUrls: ['validation.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NxEmailComponent,
        NxProcessButtonComponent,
        NxPasswordComponent,
        NxPasswordValidationComponent,
    ],
})
export class ValidationComponent {
    data = {
        newPassword: '',
        email: '',
    };
    change: Process;
    restore: Process;

    constructor(private processService: NxProcessService) {}

    ngOnInit(): void {
        this.change = this.processService.createProcess(() => {
            return Promise.resolve(true);
        });

        this.restore = this.processService.createProcess(() => {
            return Promise.resolve(true);
        });
    }
}
