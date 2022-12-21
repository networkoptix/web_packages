import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-start',
    templateUrl: './start.component.html',
    styleUrls: ['./start.component.scss']
})
export class StartComponent implements OnInit {
    buttonWidth: number;

    @ViewChild('setupButton', { static: true }) setupButton : ElementRef<HTMLButtonElement>;
    @ViewChild('mergeButton', { static: true }) mergeButton : ElementRef<HTMLButtonElement>;

    constructor(private wizardService: WizardStateService) { }

    ngOnInit(): void {
        this.buttonWidth = Math.max(
            this.setupButton.nativeElement.offsetWidth,
            this.mergeButton.nativeElement.offsetWidth
        );
        this.buttonWidth += 2; // adjust width rounding
    }

    mergeSystem(): void {
        this.wizardService.skip();
    }

    setupSystem(): void {
        this.wizardService.next();
    }
}
