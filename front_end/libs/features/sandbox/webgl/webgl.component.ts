import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxSystemCameraWithMappedFields } from '@components/layout-grid/layout-grid.types';
import { NxWebGLCanvasComponent } from '@components/nx-webgl-canvas/webgl-canvas.component';
import { NxAccountService } from '@services/account.service';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';

// SOFIA
const SYSTEM_ID = '6fc7257e-7dd9-465e-b898-c04a9a4fa531';
const SERVER_ID = 'a29fc3f4-0de6-0ed6-be0a-a55bc0ea5393';
const CAMERA_ID = '28211a91-4d61-e6b9-da49-172c127da68b';
// DESKTOP-UBUNTU
// const SERVER_ID = '4087425b-f052-413d-96d9-79385ae2cdb6';
// const CAMERA_ID = 'd4650aab-4812-f660-683e-a2c3f866028b?time=live';
// QA
// const SERVER_ID = 'b1012488-9fd0-449d-99f9-8c0604b99a45';
// const CAMERA_ID = '3645c7ee-ca91-e579-e753-1d85af1fd08c';

@UntilDestroy()
@Component({
    selector: 'webgl',
    templateUrl: 'webgl.component.html',
    styleUrls: ['webgl.component.scss'],
    standalone: true,
    imports: [CommonModule, NxWebGLCanvasComponent],
})
export class WebglComponent {
    end: number;
    data: Array<{ durationMs: string; startTimeMs: string }>;
    newData: Array<{ durationMs: string; startTimeMs: string }>;

    system: NxSystem;

    cameras$$ = signal<NxSystemCameraWithMappedFields[]>([]);
    currentCameras$$ = computed(() => {
        return this.cameras$$().filter(({ id }) => CAMERA_ID === id);
    });

    selectedCameraId$$ = computed(() => {
        return CAMERA_ID;
    });

    constructor(
        private systemService: NxSystemService,
        private accountService: NxAccountService,
    ) {
        this.data = [];
    }

    async ngOnInit(): Promise<void> {
        // await this.systemsService.getSystemAsPromise(SERVER_ID);
        this.system = this.systemService.createSystem(
            this.accountService.account.email,
            SYSTEM_ID,
            SERVER_ID,
            false,
            false,
            6,
        );
        await this.system.update();

        this.cameras$$.set(
            this.system.cameraManager.cameras.map(
                (camera: NxSystemCamera): NxSystemCameraWithMappedFields => {
                    return {
                        ...camera,
                        id: camera.id,
                        name: camera.name,
                        online: true,
                        requiresTranscoding: false,
                        unauthorized: false,
                        isDefaultPassword: false,
                        // type: camera.type,
                        status: camera.status,
                        // selected: true, // camera.id === CAMERA_ID,
                    };
                },
            ),
        );
    }
}
