import { Component, ElementRef, ViewChild } from '@angular/core';

@Component({
    selector: 'nx-modal-wizard',
    templateUrl: 'wizard.component.html',
    styleUrls: []
})
export class WizardModalContent {
    @ViewChild('iframe', { static: false }) iframe: ElementRef<HTMLIFrameElement>;

    setFocus(): void {
        this.iframe.nativeElement.contentWindow.focus();
    }
}
