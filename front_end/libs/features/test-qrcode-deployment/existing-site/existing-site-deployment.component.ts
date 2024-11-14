import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'nx-existing-site-deployment',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['existing-site-deployment.component.scss'],
    templateUrl: 'existing-site-deployment.component.html',
    imports: [CommonModule],
})
export class ExistingSiteDeployment {}
