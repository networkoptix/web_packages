import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { filter } from 'rxjs/operators';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { environment } from '@environments/environment';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { isUUID } from '@utils/general';

import { NxAPIToolSystemService } from '../services/api-tool-system.service';
import { NxOpenAPIJSONService } from '../services/openapi-json.service';
import { NxReadonlyAPIService } from '../services/readonly-api.service';

import { findExistingItem, makeDropdownDisplayName, makeReadonlyAPIName, makeSystemName } from './api-tool-dropdown-utils';

interface SystemDropdownItem extends DropdownItem<string> {
    disabled: boolean;
    icon: string;
}

interface ServerDropdownItem extends DropdownItem<string> {
    disabled: boolean;
}

interface TypeDropdownItem extends DropdownItem<string> {
    disabled: boolean;
}

@UntilDestroy()
@Component({
    selector: 'nx-api-tool-dropdowns',
    templateUrl: './api-tool-dropdowns.component.html',
    styleUrls: ['./api-tool-dropdowns.component.scss']
})
export class NxAPIToolDropdownsComponent implements OnInit {
    CONFIG: IConfig;
    readonly environment = environment;

    system : SystemDropdownItem;
    systems: SystemDropdownItem[] = [];
    hasSeparator = false;
    hasSystems = false;

    server : ServerDropdownItem;
    servers: ServerDropdownItem[] = [];
    serverDropdownEnabled = false; // current design has server dropdown permanently disabled

    type : TypeDropdownItem;
    types: TypeDropdownItem[] = [];

    constructor(
        private configService: NxConfigService,
        public APIToolSystemService: NxAPIToolSystemService,
        private openAPIJSONService: NxOpenAPIJSONService,
        private readonlyAPIService: NxReadonlyAPIService
    ) {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnInit(): void {
        this.APIToolSystemService.systemEmitter$.pipe(untilDestroyed(this), filter(systemInfo => !!systemInfo)).subscribe(({ info: system, disabled, error }) => {
            const existingItem = this.systems.find(systemItem => systemItem.value === system.id);
            const sysName = makeSystemName(system);
            const displayName = makeDropdownDisplayName(sysName, error);
            if (existingItem) {
                existingItem.name = displayName;
                existingItem.disabled = disabled;
            } else {
                this.hasSystems = true;
                this.systems.push({
                    value: system.id,
                    name: displayName,
                    disabled,
                    icon: this.CONFIG.icons.dirTextButtons + 'storage_cloud.svg'
                });
            }
        });

        this.APIToolSystemService.serverEmitter$.pipe(untilDestroyed(this), filter(serverInfo => !!serverInfo)).subscribe(({ info: serverInfo, disabled, error }) => {
            const { server } = serverInfo;
            const existingItem = this.servers.find(serverItem => serverItem.value === server.id);
            const displayName = makeDropdownDisplayName(server.name, error);
            if (existingItem) {
                existingItem.name = displayName;
                existingItem.disabled = disabled;
            } else {
                this.servers.push({
                    value: server.id,
                    name: displayName,
                    disabled
                });
            }
        });

        this.openAPIJSONService.APITypeEmitter.pipe(untilDestroyed(this), filter(APIType => !!APIType)).subscribe(({ info: APIType, disabled }) => {
            const existingItem = findExistingItem(this.types, APIType.type);
            if (existingItem) {
                existingItem.disabled = disabled;
            } else {
                this.types.push({
                    value: APIType.type,
                    name: APIType.displayName,
                    disabled
                });
                if (this.openAPIJSONService.currentType === APIType.type) {
                    this.type = this.types[this.types.length - 1];
                }
            }
        });

        this.readonlyAPIService.readonlyAPIEmitter$.pipe(untilDestroyed(this)).subscribe(({ info: api, disabled }) => {
            const existingItem = findExistingItem(
                this.systems,
                api.id.toString()
            );
            const displayName = makeReadonlyAPIName(api);
            if (existingItem) {
                existingItem.disabled = disabled;
            } else {
                if (!this.hasSeparator && this.hasSystems) {
                    this.systems.push(
                        { name: 'seperator' } as SystemDropdownItem
                    );
                    this.hasSeparator = true;
                }
                this.systems.push({ // Readonly APIs are displayed in the system dropdown
                    value: api.id.toString(),
                    name: displayName,
                    disabled,
                    icon: this.CONFIG.icons.dirNonStandard + 'api.svg'
                });
            }
        });

        this.APIToolSystemService.loading$.pipe(untilDestroyed(this)).subscribe(loading => {
            if (!loading) { // set dropdowns after changing system/first load
                const systemToFind = this.APIToolSystemService.currentSystemId || this.readonlyAPIService.currentReadonlyAPI?.api?.id.toString();
                this.system = findExistingItem(this.systems, systemToFind);
                this.server = findExistingItem(this.servers, this.APIToolSystemService.currentServerId);
                this.type = findExistingItem(this.types, this.openAPIJSONService.currentType || 'main') || this.types[0];
            }
        });

        this.APIToolSystemService.currentSystemId$.pipe(untilDestroyed(this), filter(systemId => !!systemId)).subscribe(() => {
            const systemToFind = this.APIToolSystemService.currentSystemId || this.readonlyAPIService.currentReadonlyAPI?.api?.id.toString();
            this.system = findExistingItem(this.systems, systemToFind);
            this.resetDropdowns();
        });

        this.readonlyAPIService.currentReadonlyAPI$.pipe(untilDestroyed(this), filter(readonlyAPI => !!readonlyAPI)).subscribe(() => {
            this.resetDropdowns();
            this.types.push({ // currently readonlyAPIs only show one type
                value: 'main',
                name: 'Current Version',
                disabled: false
            });
            this.type = this.types[0];
            this.openAPIJSONService.currentType = 'main';
        });
    }

    onSystemChange(system: SystemDropdownItem): void {
        if (isUUID(system.value)) {
            this.APIToolSystemService.manualSystemChange = true;
            this.APIToolSystemService.currentSystemId = system.value;
        } else {
            this.readonlyAPIService.setReadonlyAPI(parseInt(system.value));
        }
    }

    onServerChange(server: ServerDropdownItem): void {
        this.APIToolSystemService.currentServerId = server.value;
    }

    onTypeChange(type: TypeDropdownItem): void {
        this.openAPIJSONService.setAPIType(this.server.value, type.value);
    }

    resetDropdowns = (): void => {
        this.servers = [];
        this.server = undefined;
        this.types = [];
        this.type = undefined;
    };
}
