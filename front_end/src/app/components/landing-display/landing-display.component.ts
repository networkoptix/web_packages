import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { NxCloudApiService } from '@services/nx-cloud-api';

@Component({
    selector: 'landing-display-component',
    template: '<div [innerHTML]="compTemplate"></div>',
    styleUrls: ['landing-display.component.scss']
})

export class NxLandingDisplayComponent implements OnInit {
    compTemplate: SafeHtml;

    constructor(
        private sanitizer: DomSanitizer,
        private apiService: NxCloudApiService
    ) {}

    ngOnInit(): void {
        this.apiService
            .getStaticLanding()
            .toPromise()
            .then(result => {
                this.compTemplate = this.sanitizer.bypassSecurityTrustHtml(result);
            });
    }
}
