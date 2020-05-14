import {
    Component, OnInit, Input,
    ViewEncapsulation
}                                   from '@angular/core';
import { NxConfigService, IConfig, Process } from '../../services';

@Component({
    selector      : 'nx-cancel-button',
    templateUrl   : 'process-cancel-button.component.html',
    styleUrls     : ['process-cancel-button.component.scss'],
    encapsulation : ViewEncapsulation.None
})
export class NxProcessCancelButtonComponent {
    @Input() process: Process;
    @Input() discardFn = () => {};
    @Input() buttonText: string;
    @Input() customClass = ''

    discard() {
        this.process.cancel();
        this.discardFn();
    }
}
