import { Component } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-get-started',
    templateUrl : 'get-started.component.html',
    styleUrls   : ['get-started.component.scss']
})
export class NxGetStartedComponent {};
