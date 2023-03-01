import { Component } from '@angular/core';

import { NxMenuService } from '@app/menu/menu.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

@Component({
    selector: 'validation',
    templateUrl: 'validation.component.html',
    styleUrls: ['validation.component.scss'],
})
export class ValidationComponent {
    data = {
        newPassword: '',
        email: ''
    };
    change: Process;
    restore: Process;

    constructor(private processService: NxProcessService, private menuService: NxMenuService) {}

    ngOnInit(): void {
        this.menuService.section = 'components';
        this.menuService.detail = 'validation';

        this.change = this.processService.createProcess(() => {
            return Promise.resolve(true);
        });

        this.restore = this.processService.createProcess(() => {
            return Promise.resolve(true);
        });
    }
}
