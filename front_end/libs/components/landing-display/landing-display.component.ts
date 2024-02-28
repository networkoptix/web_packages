import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';

import { NxCloudApiService } from '@services/nx-cloud-api';

@Component({
    selector: 'nx-landing-display-component',
    template: '<div data-testid="landingComponent" [innerHTML]="compTemplate"></div>',
    styleUrls: ['landing-display.component.scss'],
    standalone: true,
})
export class NxLandingDisplayComponent implements OnInit {
    compTemplate: SafeHtml;

    constructor(
        private sanitizer: DomSanitizer,
        private apiService: NxCloudApiService,
    ) {}

    ngOnInit(): void {
        firstValueFrom(this.apiService.getStaticLanding()).then(result => {
            this.compTemplate = this.sanitizer.bypassSecurityTrustHtml(result);
        });
    }
}
