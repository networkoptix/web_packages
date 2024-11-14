import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'nx-test-qrcode-deployment',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['test-qrcode-deployment.component.scss'],
    templateUrl: 'test-qrcode-deployment.component.html',
    imports: [CommonModule],
})
export class TestQrCodeDeploymentComponent {
    router = inject(Router);
    activatedRoute = inject(ActivatedRoute);
    handleNewSiteClick(): void {
        this.router.navigate(['new-site'], { relativeTo: this.activatedRoute });
    }
    handleExistingSiteClick(): void {
        this.router.navigate(['existing-site'], { relativeTo: this.activatedRoute });
    }
}
