import { Component } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-dev-tools',
    templateUrl : 'dev-tools.component.html',
    styleUrls   : ['dev-tools.component.scss']
})
export class NxDevToolsComponent {};
