import { Component, Inject, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

import { WizardStateService } from '../services/wizard-state.service';
import { iState, WIZARD_STATE } from '../types/wizard-state.types';

@Component({
    selector: 'nx-wizard',
    templateUrl: './wizard.component.html',
    styleUrls: ['./wizard.component.scss']
})
export class WizardComponent implements OnInit {
    CONFIG: IConfig;

    nextDisabled = false;
    state$ = new BehaviorSubject<WIZARD_STATE>(undefined);
    fsm: iState;

    readonly start = WIZARD_STATE.Start;

    constructor(
        config: NxConfigService,
        private wizardService: WizardStateService,
        @Inject(WINDOW) public window: Window
    ) {
        this.CONFIG = config.getConfig();
    }

    ngOnInit(): void {
        this.wizardService.init();
        this.state$ = this.wizardService.currentState$;
        this.state$.subscribe(() => {
            this.fsm = this.wizardService.fsm;
        });
    }

    back(): void {
        this.wizardService.back();
    }
    cancel(): void {
        this.wizardService.cancel();
    }
    finish(): void {
        this.wizardService.finish();
    }
    next(): void {
        this.wizardService.next();
    }
    retry(): void {
        this.wizardService.retry();
    }
}
