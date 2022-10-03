import { Component } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxLandingService } from './landing.service';

@UntilDestroy()
@Component({
    selector: 'nx-landing-page',
    templateUrl: './landing-page.component.html',
    styleUrls: ['./landing-page.component.scss'],
    providers: [NxLandingService]
})
export class NxLandingPageComponent {
    constructor(public landingService: NxLandingService) {}
}
