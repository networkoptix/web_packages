import { OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectorRef, Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { Observable, Subject } from 'rxjs';
import { debounceTime, switchMap, shareReplay, map, tap, catchError } from 'rxjs/operators';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxStepperComponent } from '@components/stepper/stepper.component';
import { NxTagComponent } from '@components/tag/tag.component';
import type { Bookmark } from '@pages/systems/bookmarks/bookmarks.types';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { icons } from '@static-variables';

import { NxHealthMonitorWidgetComponent } from '../health-monitor/health-monitor-widget.component';
import { FirstPartyWidget } from '../helper-classes';

interface BookmarkWithOpener extends Bookmark {
    isOpen?: boolean;
}

interface SystemDropdownItem extends DropdownItem<string> {
    disabled: boolean;
}

// const getMockBookmarks = (val?): any => Array.isArray(val) && val.length ? val : new Array(50).fill(Math.round(Math.random() * 10000)).map((_, i) => ({
//     id: `id-${i}`,
//     deviceId: `bookmark${i}`,
//     name: `Bookmark ${i}`,
//     description: `Description for bookmark number ${i}`,
//     startTimeMs: Date.now() - (Math.round(Math.random() * 100000000)),
//     durationMs: Math.round(Math.random() * 1000000),
//     tags: new Array(Math.ceil(Math.random() * 5)).fill('').map((_, i) => `Tag ${i}`),
//     creatorUserId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
//     creationTimeMs: '2021-02-05T19:00:30'
// }));

@UntilDestroy()
@Component({
    selector: 'nx-bookmarks-widget',
    templateUrl: './bookmarks-widget.component.html',
    styleUrls: ['./bookmarks-widget.component.scss'],
    standalone: true,
    imports: [
        AngularSvgIconModule,
        NxPreLoaderComponent,
        NxStepperComponent,
        NxTagComponent,
        OverlayModule,
    ],
})
export class NxBookmarksWidgetComponent extends FirstPartyWidget<
    typeof NxBookmarksWidgetComponent.BASE_CONFIG
> {
    static IDENTIFIER = 'bookmarks';
    static NAME = 'Bookmarks';
    static SIZES = [
        { name: '2 x 4', value: { cols: 2, rows: 4 } },
        { name: '4 x 6', value: { cols: 4, rows: 6 } },
    ];

    static BASE_CONFIG = {
        selectedSystem: '',
    };

    static cloudApi: NxCloudApiService;
    static updateSystems$ = new Subject();
    static systemUpdater$ = NxBookmarksWidgetComponent.updateSystems$.pipe(
        debounceTime(100),
        switchMap(_ => NxBookmarksWidgetComponent.cloudApi.systems()),
        shareReplay({
            bufferSize: 1,
            refCount: true,
        }),
    );

    updater$ = new Subject();
    selectedSystem: SystemDropdownItem;
    system: NxSystem;
    loading = false;

    mockThumbnail = 'https://c.tenor.com/6_9oJ4U37pgAAAAM/rickroll-dance.gif';

    icons = icons;

    bookmarks$ = this.updater$.pipe(
        tap(this.toggleLoading),
        switchMap(async _ => {
            if (!this.system.mediaserver.authGet) {
                await this.system.updateSystemAuth();
            }
        }),
        switchMap(_ => this.system.getBookmarks()),
        // map(getMockBookmarks), Use in case you want to demo when no bookmarks
        switchMap(async (bookmarks: any) =>
            bookmarks.map(bookmark => {
                const thumbnail = this.system.serverManager.getPreviewUrl(
                    bookmark.deviceId,
                    bookmark.startTimeMs,
                    800,
                    800,
                    0,
                    this.system.mediaserver.authGet,
                );
                return { ...bookmark, thumbnail };
            }),
        ),
        catchError(_ => Promise.resolve([])), // Promise.resolve(getMockBookmarks()) if demo
        tap(this.toggleLoading),
    ) as Observable<BookmarkWithOpener[]>;

    systemsDropdownItems$: Observable<SystemDropdownItem[]> = this.cloudApi.systems().pipe(
        map(systems =>
            systems.map(({ id: value, name, stateOfHealth }) => ({
                name: stateOfHealth !== 'online' ? `${name} (${stateOfHealth})` : name,
                disabled: stateOfHealth !== 'online',
                value,
            })),
        ),
        tap(async systems => {
            if (!systems.length) {
                return;
            }
            const selectedSystem: SystemDropdownItem =
                systems.find(({ value }) => value === this.card.config.selectedSystem) ||
                systems.find(({ disabled }) => !disabled) ||
                systems[0];
            this.system ||= this.systemService.createSystem(
                this.accountService.email,
                selectedSystem.value,
            );
            this.updateSystem(selectedSystem);
        }),
        shareReplay({
            bufferSize: 1,
            refCount: true,
        }),
    );

    toggleLoading(): void {
        this.loading = !this.loading;
    }

    updateSystem(system: SystemDropdownItem): void {
        this.selectedSystem = system;
        this.card.config.selectedSystem = system.value;
        this.refreshData();
    }

    refreshData(): void {
        this.updater$.next('update bookmarks');
    }

    constructor(
        cd: ChangeDetectorRef,
        private cloudApi: NxCloudApiService,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
    ) {
        super(cd);
        NxHealthMonitorWidgetComponent.cloudApi = this.cloudApi;
        NxHealthMonitorWidgetComponent.systemUpdater$
            .pipe(untilDestroyed(this))
            .subscribe(NxHealthMonitorWidgetComponent.systems$);
        NxHealthMonitorWidgetComponent.updateSystems$.next('update');
        this.systemsDropdownItems$.toPromise();
    }
}

NxBookmarksWidgetComponent.registerWidget();
