import { Component, OnInit } from '@angular/core';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'app-broken-system',
    templateUrl: './broken-system.component.html',
    styleUrls: ['./broken-system.component.scss']
})
export class BrokenSystemComponent implements OnInit {
    constructor(private wizardService: WizardStateService) { }

    ngOnInit(): void {
    }

    retry(): void {
        this.wizardService.retry();
    }
}
