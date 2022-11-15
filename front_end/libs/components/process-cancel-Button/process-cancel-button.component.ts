import { Component, Input, ViewEncapsulation } from '@angular/core';

import { Process } from '@services/process.service/process';

@Component({
    selector: 'nx-cancel-button',
    templateUrl: 'process-cancel-button.component.html',
    styleUrls: ['process-cancel-button.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxProcessCancelButtonComponent {
    @Input() process: Process;
    @Input() cancelFn?: () => void;
    @Input() discardFn: () => void;
    @Input() buttonText: string;
    @Input() customClass: string = '';
    @Input() showDiscard: boolean = false;
    @Input() id: string;

    handleClick(): void {
        if (this.process?.processing) {
            this.process.cancel();
            this.cancelFn?.();
        } else {
            this.discardFn();
        }
    }
}
