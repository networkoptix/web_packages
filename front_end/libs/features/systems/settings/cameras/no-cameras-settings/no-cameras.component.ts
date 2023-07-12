import { Component, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { NxSystem } from '@app/services/system.service/system';
import { cleanId } from '@app/utils/general';

@Component({
    selector: 'nx-no-cameras-component',
    templateUrl: 'no-cameras.component.html',
    styleUrls: ['no-cameras.component.scss'],
})
export class NxNoCamerasComponent implements OnInit {
    @Input() system: NxSystem;
    private router: Router = inject(Router);
    private activatedRoute: ActivatedRoute = inject(ActivatedRoute);

    ngOnInit(): void {
        this.system.infoSubject.pipe(takeUntilDestroyed()).subscribe(system => {
            if (system?.cameraManager.cameras?.length > 0) {
                const cameraId = cleanId(system.cameraManager.cameras[0].id);
                this.router.navigate([cameraId], { relativeTo: this.activatedRoute });
            }
        });
    }
}
