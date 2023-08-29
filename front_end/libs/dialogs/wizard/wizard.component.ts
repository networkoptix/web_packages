import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { environment } from '@environments/environment';
import { PipesModule } from '@pipes/pipes.module';

@Component({
    selector: 'nx-modal-wizard',
    templateUrl: 'wizard.component.html',
    styleUrls: [],
    standalone: true,
    imports: [CommonModule, PipesModule],
})
export class WizardModalContent implements OnInit {
    readonly baseInlineUrl: string = '/static/inline.html';
    inlineUrl: string;

    @ViewChild('iframe', { static: false }) iframe: ElementRef<HTMLIFrameElement>;

    constructor(private translate: TranslateService) {}

    ngOnInit(): void {
        this.inlineUrl = `${this.baseInlineUrl}?lang=${this.translate.currentLang}`;
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
