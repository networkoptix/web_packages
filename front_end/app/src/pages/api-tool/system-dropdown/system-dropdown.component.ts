import { Component } from '@angular/core';

import { environment } from '@environments/environment';
import { NxSystemService } from '@services/system.service';
import { NxUtilsService } from '@services/utils.service';

import type { APIDropdownItem, SystemDropdownItem } from '../api-tool-types';
import { NxAPIToolService } from '../api-tool.service';
@Component({
    selector: 'nx-system-dropdown',
    templateUrl: './system-dropdown.component.html',
    styleUrls: ['./system-dropdown.component.scss']
})
export class NxSystemDropdownComponent {
    readonly environment = environment;
    serverDropdownEnabled = false; // Server dropdown is disabled permanently in the current design

    constructor(
        public APIToolService: NxAPIToolService,
        private systemService: NxSystemService
    ) {}

    onSystemChange(system: SystemDropdownItem) {
        this.APIToolService.menuNodes = undefined;
        this.APIToolService.APIDropdown = [];
        this.APIToolService.selectedSystem = system;
        this.APIToolService.outDatedSystem = false;
        if (NxUtilsService.isUUID(system.value)) {
            this.APIToolService.system = this.systemService.createSystem('', system.value as string);
            this.APIToolService.activeNode = null;
            this.APIToolService.selectedAPI = null;
            this.APIToolService.handleSystemChange();
        } else {
            this.APIToolService.makeReadOnlyAPI();
            this.APIToolService.serversDropdown = [];
        }
    }

    onServerChange(server) {
    }

    onAPIVersionChange(api: APIDropdownItem) {
        const firstNode = this.APIToolService.menuNodes?.find(node => true);
        this.APIToolService.changeAPIVersion(api, firstNode?.url);
        this.APIToolService.setAPIInfo();
        this.APIToolService.menuNodes = api.menu;
        this.APIToolService.activeNode = firstNode;
    }
}
