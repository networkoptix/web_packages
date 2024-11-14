import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'nx-new-site-deployment',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['new-site-deployment.component.scss'],
    templateUrl: 'new-site-deployment.component.html',
    imports: [CommonModule],
})
export class NewSiteDeploymentComponent {}
