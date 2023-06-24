import { Component, HostListener, Inject, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject } from 'rxjs';

import { icons } from '@lib/variables/static-variables';
import { WINDOW } from '@services/window-provider';

import { WizardStateService } from '../services/wizard-state.service';
import { iState, WIZARD_STATE } from '../types/wizard-state.types';

@UntilDestroy()
@Component({
    selector: 'nx-wizard',
    templateUrl: './wizard.component.html',
    styleUrls: ['./wizard.component.scss'],
})
export class WizardComponent implements OnInit {
    icons = icons;

    showFooter: boolean;
    nextDisabled = false;
    state$ = new BehaviorSubject<WIZARD_STATE>(undefined);
    fsm: iState;

    readonly start = WIZARD_STATE.Start;
    readonly initFailure = WIZARD_STATE.InitFailure;
    readonly brokenSystem = WIZARD_STATE.BrokenSystem;
    readonly LocalFailure = WIZARD_STATE.LocalFailure;
    readonly mergeProgress = WIZARD_STATE.MergeProcess;

    readonly noFooterComponents = [
        WIZARD_STATE.Start,
        WIZARD_STATE.BrokenSystem,
        WIZARD_STATE.LocalFailure,
        WIZARD_STATE.MergeProcess,
    ];

    constructor(public wizardService: WizardStateService, @Inject(WINDOW) public window: Window) {}

    ngOnInit(): void {
        this.wizardService.init();
        this.state$ = this.wizardService.currentState$;
        this.state$.pipe(untilDestroyed(this)).subscribe(() => {
            this.fsm = this.wizardService.fsm;
            this.showFooter = !this.noFooterComponents.includes(this.state$.getValue());
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

    @HostListener('document:keypress', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            if (this.wizardService.currentState === 'localSuccess') {
                this.finish();
            } else {
                this.next();
            }
        }
    }
}
