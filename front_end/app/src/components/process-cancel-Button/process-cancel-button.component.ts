import { Component, Input, ViewEncapsulation } from '@angular/core';

import { Process } from '@services/process.service';

@Component({
    selector: 'nx-cancel-button',
    templateUrl: 'process-cancel-button.component.html',
    styleUrls: ['process-cancel-button.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxProcessCancelButtonComponent {
    @Input() process: Process;
    @Input() discardFn: () => void;
    @Input() buttonText: string;
    @Input() customClass = '';
    @Input() showDiscard = false;

    handleClick(): void {
        if (this.process?.processing) {
            this.process.cancel();
        } else {
            this.discardFn();
        }
    }
}
