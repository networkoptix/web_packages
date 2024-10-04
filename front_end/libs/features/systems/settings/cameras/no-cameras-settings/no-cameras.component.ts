import { Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { NxSystem } from '@services/system.service/system';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-no-cameras-component',
    templateUrl: 'no-cameras.component.html',
    styleUrls: ['no-cameras.component.scss'],
})
export class NxNoCamerasComponent implements OnInit {
    @Input() system: NxSystem;
    icons = icons;
    private router: Router = inject(Router);
    private activatedRoute: ActivatedRoute = inject(ActivatedRoute);
    destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        this.system.infoSubject.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(system => {
            const editableCameras = system?.cameraManager.cameras?.filter(({ id }) =>
                system.permissionManager.canEditDevice(id),
            );
            if (editableCameras?.length > 0) {
                const cameraId = editableCameras[0].id;
                this.router.navigate([cameraId], { relativeTo: this.activatedRoute });
            }
        });
    }
}
