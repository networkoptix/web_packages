import {
    Component,
    OnInit
}                            from '@angular/core';
import { NxCloudApiService }      from '../../services/nx-cloud-api';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    selector  : 'landing-display-component',
    template  : `
         <div [innerHTML]="compTemplate"></div>`,
    styleUrls : ['landing-display.component.scss']
})

export class NxLandingDisplayComponent implements OnInit {
    compTemplate: SafeHtml;

    constructor(
        private sanitizer: DomSanitizer,
        private apiService: NxCloudApiService
    ) {}

    ngOnInit() {
        this.apiService
            .getStaticLanding()
            .toPromise()
            .then((result) => {
                this.compTemplate = this.sanitizer.bypassSecurityTrustHtml(result);
            });
    }
}
