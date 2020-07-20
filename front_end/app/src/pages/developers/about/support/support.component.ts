import { Component } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-support',
    templateUrl : 'support.component.html',
    styleUrls   : ['support.component.scss']
})
export class NxSupportComponent {};
