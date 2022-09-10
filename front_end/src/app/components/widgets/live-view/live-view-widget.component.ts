import { ChangeDetectorRef, Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Subject, BehaviorSubject, combineLatest, interval, Observable } from 'rxjs';
import { debounceTime, switchMap, shareReplay, map, tap, startWith } from 'rxjs/operators';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { NxSystem } from '@services/system.service/system';
import type {
    NxSystemWithUserInfo
} from '@services/system.service/system-types';
import { NxSystemService } from '@services/system.service/system.service';
import { cleanId } from '@utils/general';

import { FirstPartyWidget } from '../helper-classes';

interface SystemDropdownItem extends DropdownItem<string> {
    disabled: boolean;
}

interface CameraDropdownItem extends DropdownItem<string> {
    state: string;
    disabled: boolean;
}

@UntilDestroy()
@Component({
    selector: 'nx-live-view-widget',
    templateUrl: './live-view-widget.component.html',
    styleUrls: ['./live-view-widget.component.scss']
})
export class NxLiveViewWidgetComponent extends FirstPartyWidget<
    typeof NxLiveViewWidgetComponent.BASE_CONFIG
> {
    CONFIG: IConfig;

    static IDENTIFIER = 'live-view';
    static NAME = 'Live View';
    static SIZES = [
        { name: '4 x 3', value: { cols: 4, rows: 3 } },
        { name: '4 x 4', value: { cols: 4, rows: 4 } },
        { name: '8 x 6', value: { cols: 8, rows: 6 } }
    ];

    static BASE_CONFIG = {
        selectedSystem: '',
        selectedCamera: '',
        autoUpdate: true,
        updateInterval: 1
    };

    static cloudApi: NxCloudApiService;
    static updateSystems$ = new Subject();
    static systemUpdater$ = NxLiveViewWidgetComponent.updateSystems$.pipe(
        debounceTime(100),
        switchMap(_ => NxLiveViewWidgetComponent.cloudApi.systems()),
        shareReplay({
            bufferSize: 1,
            refCount: true
        })
    );

    CUSTOM_LABELS = ['Select System', 'Select Camera', 'Auto Update'];

    static systems$ = new BehaviorSubject<NxSystemWithUserInfo[]>([]);
    updater$ = new Subject();
    system: NxSystem;
    selectedSystem: SystemDropdownItem;
    selectedCamera: CameraDropdownItem;
    size: { width: number, height: number } = { width: 640, height: 640 };

    systemsDropdownItems$ = this.cloudApi.systems().pipe(
        map(systems => systems.map(({ id, name, stateOfHealth }) => ({
            name: stateOfHealth !== 'online' ? `${name} (${stateOfHealth})` : name,
            disabled: stateOfHealth !== 'online',
            value: cleanId(id)
        }))),
        tap(async (systems: any) => {
            if (!systems.length) {
                return;
            }
            const selectedSystem = systems.find(({ value }) => value === this.card.config.selectedSystem) || systems.find(({ disabled }) => !disabled) || systems[0];
            this.updateSystem(selectedSystem);
        })
    );

    thumbnailsUpdater$ = new BehaviorSubject(Date.now());

    cameraThumbnails$ = this.thumbnailsUpdater$.pipe(
        switchMap(time => {
            this.system = this.systemService.createSystem(this.accountService.email, this.card.config.selectedSystem);
            const cameras = this.system.cameraManager.cameras;
            return combineLatest([
                this.card.config.autoUpdate ? interval(this.card.config.updateInterval * 1000).pipe(startWith(0)) : Promise.resolve(time),
                cameras ? Promise.resolve(cameras) : this.system.cameraManager.getCameras()
            ]);
        }),
        map(([time, cameras]) => cameras.reduce((lookup, { id, rotation, name }) => {
            const previewUrl = this.system.mediaserver.previewUrl(id, 0, this.size.width, this.size.height, rotation as number);
            return {
                ...lookup,
                [cleanId(id)]: { previewUrl, name }
            };
        }, {}))
    );

    refreshThumbnail = () => this.thumbnailsUpdater$.next(Date.now());

    camerasDropdownItems$: Observable<CameraDropdownItem[]> = this.updater$.pipe(
        switchMap(async _ => {
            if (!this.system) {
                return [];
            }
            await this.initCameras();
            const cameras = this.system.cameraManager.cameras || [];
            return cameras.map<CameraDropdownItem>(({ name, id, status: state }) => ({ name, state, disabled: state !== 'online' && false, value: cleanId(id) }));
        }),
        tap(cameras => {
            this.selectedCamera = cameras.find(({ value }) => value === this.card.config.selectedCamera) || cameras.find(({ disabled }) => !disabled) || cameras[0];
            if (this.selectedCamera) {
                this.card.config.selectedCamera = this.selectedCamera.value;
            }
        })
    );

    initCameras = () => {
        this.system = this.systemService.createSystem(this.accountService.email, this.card.config.selectedSystem);
        return this.system.getMediaServersAndCameras(true);
    };

    updateSystem(system: SystemDropdownItem): void {
        this.selectedSystem = system;
        this.card.config.selectedSystem = system.value;
        this.system = this.systemService.createSystem(this.accountService.email, system.value);
        this.refreshCameras();
    }

    updateCamera(camera: CameraDropdownItem): void {
        this.selectedCamera = camera;
        this.card.config.selectedCamera = camera.value;
    }

    refreshCameras = (): void => {
        this.updater$.next('update');
    };

    updateContainerSize = (size): void => {
        this.size = size;
    };

    constructor(
        cd: ChangeDetectorRef,
        configService: NxConfigService,
        private cloudApi: NxCloudApiService,
        private accountService: NxAccountService,
        private systemService: NxSystemService
    ) {
        super(cd);
        this.CONFIG = configService.config;
        NxLiveViewWidgetComponent.cloudApi = this.cloudApi;
        NxLiveViewWidgetComponent.systemUpdater$.pipe(
            untilDestroyed(this)
        ).subscribe(NxLiveViewWidgetComponent.systems$);
        NxLiveViewWidgetComponent.updateSystems$.next('update');
    }
}

NxLiveViewWidgetComponent.registerWidget();
