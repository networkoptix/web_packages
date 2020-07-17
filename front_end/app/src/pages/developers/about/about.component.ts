import { Component, Input } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-about',
    templateUrl : 'about.component.html',
    styleUrls   : ['about.component.scss']
})
export class NxAboutComponent {
    @Input() heading: string = 'Develop with %CLOUD_NAME%';
    @Input() lead: string = '%CLOUD_NAME% is an extensible IP Video Development Platform created for software developers who want to create new Powered-by-%VMS_NAME% products and scalable integrations.'
};
