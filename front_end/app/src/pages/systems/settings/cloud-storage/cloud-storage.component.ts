import {
    Component, Input, TemplateRef, ViewContainerRef,
} from '@angular/core';
import { startCase } from 'lodash';
import { BehaviorSubject, filter, take } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { POS_STRATEGY } from '@components/popover/popover-config';
import { NxPopoverService } from '@components/popover/popover.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxSettingsService } from '../settings.service';

enum CLOUD_STORAGE_STATES {
    DEFAULT = 'default',
    ACTIVATED = 'activated'
}

const mockLicenses = [
    { size: '100gb', state: 'Active', system: 'Some System', expires: '20 Apr 2023', key: 'abcd1234efgh5678' },
    { size: '42gb', state: 'Active', system: 'The Answer', expires: '20 Apr 2023', key: 'abcd1234efg69420' },
    { size: 'urMom', state: 'Inactive', system: 'Huge', expires: '20 Apr 2023', key: 'abcd1234efg69420' }
];

@Component({
    selector: 'nx-cloud-storage',
    templateUrl: './cloud-storage.component.html',
    styleUrls: ['./cloud-storage.component.scss']
})
export class NxCloudStorageComponent {
    @Input() type: 'servers';

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    readonly MASK = 'AAAA-AAAA-AAAA-AAAA';

    CLOUD_STORAGE_STATES = CLOUD_STORAGE_STATES;
    state = CLOUD_STORAGE_STATES.ACTIVATED;
    showKeys = false;
    fields = ['size', 'state', 'system', 'expires', 'key'];
    asc = true;
    sortBy = '';
    serverSettings = '';

    // Mock state
    cloudStorageNotUsed = true;

    // Mock Licenses
    licenses$ = new BehaviorSubject(mockLicenses);
    license = mockLicenses[0];

    // Mock Usage Info
    usageMessage = '28 GB of 50 GB (56%) is used';
    usages = [
        { size: 5, color: 'blue', title: 'Blue usage description' },
        { size: 12, color: 'green', title: 'Green usage description' },
        { size: 18, color: 'yellow', title: 'Yellow usage description' },
        { size: 29, color: 'orange', title: 'Orange usage description' }
    ];

    sort(column: string) {
        if (this.sortBy === column) {
            this.asc = !this.asc;
        } else {
            this.sortBy = column;
            this.asc = true;
        }

        this.licenses$.next(
            mockLicenses.sort((a, b) => {
                const dir = this.asc ? 1 : -1;
                const aVal = a[this.sortBy];
                const bVal = b[this.sortBy];

                if (aVal === bVal) {
                    return 0;
                }

                return aVal < bVal ? dir : -dir;
            }));
    }

    perform = (actionId: string) => this.dialogService[`cloudStorage${startCase(actionId)}`]();

    showPopover = <T>(template: TemplateRef<T>, target: HTMLElement) => {
        this.popoverService.open(
            template,
            target,
            {
                panelClass: 'rounded-popover',
                arrowOffset: 4,
                positionStrategy: POS_STRATEGY.BOTTOM
            },
            this.viewContainerRef
        );
    };

    closePopover = () => this.popoverService.close();

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        cloudApi: NxCloudApiService,
        private viewContainerRef: ViewContainerRef,
        private popoverService: NxPopoverService,
        public dialogService: NxDialogsService,
        settingsService: NxSettingsService,
    ) {
        this.CONFIG = configService.config;
        this.LANG = languageService.translations;
        if (environment.isLocal) {
            this.serverSettings = '/settings/servers';
        } else {
            settingsService.systemSubject.pipe(
                filter(system => !!system?.id),
                take(1)).toPromise().then(system => {
                this.serverSettings = `/systems/${system.id}/servers`;
            });
        }

        if (this.type !== 'servers') {
            cloudApi.checkFeatureNotice('cloudStorage', this.dialogService.cloudStorageInfo).toPromise();
        }
    }
}
