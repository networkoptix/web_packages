import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NxConfigService } from '@services/nx-config';
import { NxLandingService } from './landing.service';

@UntilDestroy()
@Component({
    selector    : 'nx-landing-page',
    templateUrl : './landing-page.component.html',
    styleUrls   : ['./landing-page.component.scss'],
    providers   : [NxLandingService]
})
export class NxLandingPageComponent {
    constructor(public landingService: NxLandingService, private config: NxConfigService, private router: Router) {
        // This is a workaround for Safari, which has issues using the landing-routing module
        if (!this.config.flagsEnabled('landingPage')) {
            // The url will not change in the browser because of skipLocationChange
            this.router.navigateByUrl('old-landing', { skipLocationChange: true });
        }
    }
}
