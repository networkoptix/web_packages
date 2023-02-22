import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

import { environment } from '@environments/environment';

@Component({
    selector: 'nx-modal-wizard',
    templateUrl: 'wizard.component.html',
    styleUrls: [],
})
export class WizardModalContent implements OnInit {
    public inlineUrl: string = '/static/inline.html';

    @ViewChild('iframe', { static: false }) iframe: ElementRef<HTMLIFrameElement>;

    ngOnInit(): void {
        if (environment.setupUrl) {
            // if running webadmin locally and want to use setup wizard
            // run setup wizard too and adjust port if needed
            this.inlineUrl = environment.setupUrl + this.inlineUrl;
        }
    }

    setFocus(): void {
        setTimeout(() => {
            this.iframe.nativeElement.contentWindow.focus();
        });
    }
}
