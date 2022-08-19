import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, Subject, timer } from 'rxjs';
import { debounceTime, map, shareReplay, switchMap, tap, retry, scan } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import type { NxSystem } from '@services/system.service/system';
import type {
    NxSystemWithUserInfo
} from '@services/system.service/system-types';
import { NxSystemService } from '@services/system.service/system.service';

import { FirstPartyWidget } from '../helper-classes';

interface SystemDropdownItem extends DropdownItem<string> {
    disabled: boolean;
}

interface HealthMonitorResource {
    value: string,
    name: string
}

const getLeafNodes = (node, result = []) => {
    const isArray = Array.isArray(node);
    const isObject = node instanceof Object;
    const children = isArray ? node : isObject ? Object.values(node) : [];
    if (children.length && children.some(child => Array.isArray(child) || child instanceof Object)) {
        for (const child of children) {
            getLeafNodes(child, result);
        }
    } else {
        result.push(node);
    }

    return result;
};

const summarizeByLevel = (
    summary, cur
) => {
    summary[cur.level] = (summary[cur.level] || 0) + 1;
    return summary;
};

@UntilDestroy()
@Component({
    selector: 'nx-health-monitor-widget',
    templateUrl: './health-monitor-widget.component.html',
    styleUrls: ['./health-monitor-widget.component.scss']
})
export class NxHealthMonitorWidgetComponent extends FirstPartyWidget<
    typeof NxHealthMonitorWidgetComponent.BASE_CONFIG
> {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    static IDENTIFIER = 'health-monitor';
    static NAME = 'Health Monitor';
    static SIZES = [
        { name: '2 x 2', value: { cols: 2, rows: 2 } },
        { name: '4 x 2', value: { cols: 4, rows: 2 } },
        { name: '4 x 4', value: { cols: 4, rows: 4 } }
    ];

    static BASE_CONFIG = {
        selectedSystem: '',
        resources: {},
        updateInterval: 5,
        autoUpdate: true
    };

    HM_STEP_LABELS = ['System', 'Resources', 'Update Interval'];

    static cloudApi: NxCloudApiService;
    static updateSystems$ = new Subject();
    static systemUpdater$ = NxHealthMonitorWidgetComponent.updateSystems$.pipe(
        debounceTime(100),
        switchMap(_ => NxHealthMonitorWidgetComponent.cloudApi.systems()),
        shareReplay({
            bufferSize: 1,
            refCount: true
        })
    );

    static manifestLookup = {};

    static systems$ = new BehaviorSubject<NxSystemWithUserInfo[]>([]);
    HealthMonitorResource: HealthMonitorResource;
    system: NxSystem;
    healthMonitorAge = 0;
    updatingIn = 0;
    manifest;
    selectedSystem: SystemDropdownItem;
    devices = [];
    loading = Date.now();
    updater$ = new Subject();
    alarms$ = this.updater$.pipe(
        switchMap(_ => this.system.mediaserver.getHealthAlarms()),
        retry(4),
        map(({ reply }) => reply),
        tap(_ => {
            const minLoadTime = 1500;
            const current = Date.now();
            const dif = current - this.loading;
            const delay = Math.max(minLoadTime - dif, 0);
            setTimeout(() => {
                this.loading = 0;
            }, delay);
        }),
        shareReplay({
            bufferSize: 1,
            refCount: true
        })
    );

    alarmsFilteredByResource$ = this.alarms$.pipe(map(alarms => {
        return Object.entries(alarms).reduce((alarms, [key, value]) => {
            if (this.card.config.resources[key].value) {
                alarms[key] = value;
            }
            return alarms;
        }, {});
    }));

    LEVEL_LOOKUP = {
        error: 'Error',
        warning: 'Warning',
        offline: 'Offline'
    };

    small$ = this.alarmsFilteredByResource$.pipe(
        map(alarms => getLeafNodes(
            alarms
        ).reduce(summarizeByLevel, {}))
    );

    medium$ = this.alarmsFilteredByResource$.pipe(
        map(alarms => Object.entries(alarms).reduce((result, [key, value]) => {
            result[key] = getLeafNodes(
                value
            ).reduce(summarizeByLevel, {});
            return result;
        }, {} as Record<string, Record<string, any>>))
    );

    large$ = this.alarmsFilteredByResource$.pipe(
        map(alarms => {
            const buildUpState = Object.entries(alarms).map(([
                key, resources
            ]) => Object.entries(resources).map(([
                id, items
            ]) => Object.entries(items).map(([
                state, types
            // eslint-disable-next-line array-bracket-newline
            ]: any) => Object.values<any[]>(
                types
            ).reduce((
                combined, next
            ) => [...combined, ...next], []).map(({
                level, text: message
            }) => {
                const currentId = `{${id}}`;
                const name = this.devices.find(({ id: deviceId }) => deviceId === currentId)?.name || currentId;
                const { resource, id: resourceId } = this.card.config.resources[key];
                return {
                    resource,
                    resourceId,
                    level,
                    key,
                    name,
                    id,
                    state,
                    message
                };
            }))));
            return getLeafNodes(buildUpState).filter(node => node instanceof Object && !Array.isArray(node));
        })
    );

    displayedColumns: string[] = ['resource', 'level', 'message'];

    systemsDropdownItems$ = this.cloudApi.systems().pipe(
        map(systems => systems.map(({ id: value, name, stateOfHealth }) => ({
            name: stateOfHealth !== 'online' ? `${name} (${stateOfHealth})` : name,
            disabled: stateOfHealth !== 'online',
            value
        }))),
        tap(async systems => {
            if (!systems.length) {
                return;
            }
            const selectedSystem = systems.find(({ value }) => value === this.card.config.selectedSystem) || systems.find(({ disabled }) => !disabled) || systems[0];
            this.updateSystem(selectedSystem, systems);
        })
    );

    resourceHeading = '(All Resources)';

    updateResourceHeading = (): void => {
        const values = Object.values(this.card.config.resources).filter(({ value }) => value);
        const all = Object.keys(this.card.config.resources).length === values.length;
        const otherHeading = values.reduce((
            joined, { name }, i, arr
        ) => `${joined}${i && arr.length > 2 ? ',' : ''}${i && arr.length > 1 ? ' ' : ''}${arr.length > 1 && i === arr.length - 1 ? 'and ' : ''}${name}`, '') as string;
        this.resourceHeading = `(${all ? 'All Resources' : otherHeading})`;
    };

    handleShowAction = ({ id = '', resourceId = '', key = '', name = '', ...element } = {}): void => {
        console.log(element);
        const queryParams = id ? { id } : {};
        const childRoute = resourceId || key;
        const route = [this.CONFIG.menus.systemSettings.baseUrl, this.system.id, 'health', childRoute];
        const url = this.router.serializeUrl(this.router.createUrlTree(route, { queryParams }));
        const segments = [name, this.card.config.resources[key]?.name, this.selectedSystem.name, 'Health Monitor'];
        const label = segments.reduce((combined, segment) => !segment ? combined : combined ? `${combined} - ${segment}` : segment, '');
        this.showAction({ url, label });
    };

    updateSystem = async (system: SystemDropdownItem, systemsToTry = []) => {
        const nextSystem = this.systemService.createSystem(this.accountService.email, system.value);
        this.manifest = NxHealthMonitorWidgetComponent.manifestLookup[system.value];

        if (!this.manifest) {
            try {
                const { reply: manifest } = await nextSystem.mediaserver.getHealthManifest().toPromise();
                NxHealthMonitorWidgetComponent.manifestLookup[system.value] = manifest;
                this.manifest = manifest;
            } catch (e) {
                if (systemsToTry.length) {
                    const [system, ...systems] = systemsToTry;
                    return this.updateSystem(system, systems);
                }
            }
        }

        this.system = nextSystem;
        this.devices = await (this.system.mediaserver.getDevices() as any).toPromise().catch(_ => []);
        this.selectedSystem = system;
        this.card.config.selectedSystem = system.value;
        this.updater$.next('update resources');
        this.card.config.resources = (this.manifest || []).reduce((resources, { id, resource, name }) => {
            if (resource) {
                const existing = this.card.config.resources?.[id];
                const value = existing?.value ?? true;
                resources[id] = { id, resource, name, value };
            }
            return resources;
        }, {});
        this.card.config.autoUpdate = this.card.config.autoUpdate ?? NxHealthMonitorWidgetComponent.BASE_CONFIG.autoUpdate;
        this.card.config.updateInterval = this.card.config.updateInterval ?? NxHealthMonitorWidgetComponent.BASE_CONFIG.updateInterval;
        this.updateResourceHeading();
        this.refreshData();
    };

    refreshData = (): void => {
        this.healthMonitorAge = 0;
        this.loading = Date.now();
        this.updater$.next('update');
    };

    constructor(
        cd: ChangeDetectorRef,
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private cloudApi: NxCloudApiService,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
        private router: Router
    ) {
        super(cd);
        this.CONFIG = configService.config;
        this.LANG = languageService.translations;
        NxHealthMonitorWidgetComponent.cloudApi = this.cloudApi;
        NxHealthMonitorWidgetComponent.systemUpdater$.pipe(
            untilDestroyed(this)
        ).subscribe(NxHealthMonitorWidgetComponent.systems$);

        NxHealthMonitorWidgetComponent.updateSystems$.next('update');
        // const countdown = 60;

        timer(0, 1000).pipe(
            scan(acc => this.loading ? 0 : ++acc % 60),
            map(elapsed => this.card.config.updateInterval * 60 - elapsed - 1),
            untilDestroyed(this)
        ).subscribe(remaining => {
            if (!remaining) {
                this.healthMonitorAge = 0;
                this.refreshData();
            } else if (remaining > 60) {
                this.healthMonitorAge = this.card.config.updateInterval - Math.round(remaining / 60);
                this.updatingIn = 0;
            } else {
                this.updatingIn = remaining;
            }
        });

        this.systemsDropdownItems$.pipe(
            tap(() => {
                this.alarms$.subscribe();
                this.refreshData();
            })
        ).subscribe();
    }
}

NxHealthMonitorWidgetComponent.registerWidget();
