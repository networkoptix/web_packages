import { Component } from '@angular/core';

import { NxMenuService } from '../../../menu';
import { NxProcessService, Process } from '../../../services/process.service';

@Component({
    selector: 'validation',
    templateUrl: 'validation.component.html',
    styleUrls: ['validation.component.scss']
})
export class ValidationComponent {
    data;
    change: Process;
    restore: Process;

    constructor(
        private processService: NxProcessService,
        private menuService: NxMenuService,
    ) {}

    ngOnInit() {
        this.menuService.section = 'components';
        this.menuService.detail = 'validation';

        this.data = {
            newPassword: '',
            email: ''
        };

        this.change = this.processService.createProcess(() => {
            return Promise.resolve(true);
        });

        this.restore = this.processService.createProcess(() => {
            return Promise.resolve(true);
        });
    }
}
