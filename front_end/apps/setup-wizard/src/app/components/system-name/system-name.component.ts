import { Component, OnInit } from '@angular/core';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-system-name',
    templateUrl: './system-name.component.html',
    styleUrls: ['./system-name.component.scss'],
})
export class SystemNameComponent implements OnInit {
    get systemName(): string {
        return this.wizardService.setupConfig.systemName;
    }

    set systemName(systemName: string) {
        this.wizardService.setupConfig.systemName = systemName;
    }

    constructor(private wizardService: WizardStateService) { }

    ngOnInit(): void {
        this.systemName = this.wizardService.setupConfig.systemName;
    }

    advancedSettings(): void {
        this.wizardService.jump();
    }
}
