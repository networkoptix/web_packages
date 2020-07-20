import { Component } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-integrations',
    templateUrl : 'integrations.component.html',
    styleUrls   : ['integrations.component.scss']
})
export class NxIntegrationsComponent {};
