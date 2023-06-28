import { CdkStepperModule } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, defer, Subject, timer } from 'rxjs';
import { debounceTime, switchMap, shareReplay, map, tap, scan } from 'rxjs/operators';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxLoggerComponent } from '@components/logger/logger.component';
import { NxNumericComponent } from '@components/numeric-input/numeric.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxStepperComponent } from '@components/stepper/stepper.component';
import { NxLicenseSummaryComponent } from '@components/summary/summary.component';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';

import { FirstPartyWidget, WidgetSize } from '../helper-classes';

interface SystemDropdownItem extends DropdownItem<string> {
    disabled: boolean;
}

@UntilDestroy()
@Component({
    selector: 'nx-system-license-summary-widget',
    templateUrl: './system-license-summary-widget.component.html',
    styleUrls: ['./system-license-summary-widget.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CdkStepperModule,
        NxLicenseSummaryComponent,
        NxNumericComponent,
        NxPreLoaderComponent,
        NxGenericDropdownModule,
        NxLoggerComponent,
        NxStepperComponent,
    ],
})
export class NxSystemLicenseSummaryWidget extends FirstPartyWidget<
    typeof NxSystemLicenseSummaryWidget.BASE_CONFIG
> {
    static IDENTIFIER = 'system-license-summary';
    static NAME = 'System License Summary';
    static SIZES = [
        { name: '4 x 6', value: { cols: 4, rows: 6 } },
        { name: '6 x 12', value: { cols: 6, rows: 8 } },
        { name: '12 x 12', value: { cols: 12, rows: 8 } },
    ];

    static BASE_CONFIG = {
        selectedSystem: '',
        autoRefresh: true,
        refreshInterval: 5,
    };

    static updateSystems$ = new Subject<'update'>();
    static cloudApi: NxCloudApiService;
    static systemUpdater$ = NxSystemLicenseSummaryWidget.updateSystems$.pipe(
        debounceTime(100),
        switchMap(_ => NxSystemLicenseSummaryWidget.cloudApi.systems()),
        shareReplay({
            bufferSize: 1,
            refCount: true,
        }),
    );

    updater$ = new Subject<string>();
    serverSummaryAge = 0;
    updatingIn = 0;
    loading = Date.now();
    selectedSystem$ = new BehaviorSubject<SystemDropdownItem>(null);
    isOnline = true;
    system: NxSystem;
    system$ = defer(() => this.getSystem(this.card.config.selectedSystem));

    systemsDropdownItems$ = this.cloudApi.systems().pipe(
        map(systems =>
            systems.map(({ id: value, name, stateOfHealth }) => ({
                name: stateOfHealth !== 'online' ? `${name} (${stateOfHealth})` : name,
                disabled: stateOfHealth !== 'online',
                value,
            })),
        ),
        map(systems => {
            if (!systems.length) {
                return [];
            }
            const selectedSystem =
                systems.find(({ value }) => value === this.card.config.selectedSystem) ||
                systems.find(({ disabled }) => !disabled) ||
                systems[0];
            this.updateSystem(selectedSystem);
            return systems;
        }),
        shareReplay({
            bufferSize: 1,
            refCount: true,
        }),
    );

    updateName = (newName: string) => (size: WidgetSize) => {
        const dimensions = `${size.value.cols} x ${size.value.rows}`;
        size.name = `${newName}(${dimensions})`;
        return size.name;
    };

    getSystem = async (systemId: string): Promise<NxSystem> => {
        const system = this.systemService.createSystem(this.accountService.email, systemId);
        await system.update();
        // await system.serverManager.initSystemMediaServers();
        const systemName = system.info.name;
        const nameUpdater = this.updateName(
            `${systemName} - ${
                this.card.config.refreshInterval && this.card.config.autoRefresh
                    ? ' - ' + this.card.config.refreshInterval + 'ms'
                    : ''
            } -`,
        );
        this.card.title = nameUpdater(this.card.size);
        this.card.sizes.forEach(nameUpdater);
        this.loading = 0;
        return system;
    };

    updateSystem = (systemDropdown: SystemDropdownItem): void => {
        this.selectedSystem$.next(systemDropdown);
        this.card.config.selectedSystem = systemDropdown.value;
        this.card.config.refreshInterval =
            this.card.config.refreshInterval ??
            NxSystemLicenseSummaryWidget.BASE_CONFIG.refreshInterval;
    };

    refreshData = (): void => {
        this.serverSummaryAge = 0;
        this.loading = Date.now();
        this.updater$.next('update');
    };

    constructor(
        cd: ChangeDetectorRef,
        private cloudApi: NxCloudApiService,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
    ) {
        super(cd);
        NxSystemLicenseSummaryWidget.cloudApi = this.cloudApi;
        NxSystemLicenseSummaryWidget.updateSystems$.next('update');

        this.refreshData();
        timer(0, 1000)
            .pipe(
                scan(acc => (this.loading ? 0 : ++acc % 60)),
                map(elapsed => +this.card.config.refreshInterval * 60 - elapsed - 1),
                untilDestroyed(this),
            )
            .subscribe(remaining => {
                if (!remaining) {
                    this.serverSummaryAge = 0;
                    this.updater$.next('update');
                } else if (remaining > 60) {
                    this.serverSummaryAge =
                        +this.card.config.refreshInterval - Math.round(remaining / 60);
                    this.updatingIn = 0;
                } else {
                    this.updatingIn = remaining;
                }
            });

        this.systemsDropdownItems$
            .pipe(
                tap(() => {
                    this.refreshData();
                }),
            )
            .subscribe();
    }
}

NxSystemLicenseSummaryWidget.registerWidget();
