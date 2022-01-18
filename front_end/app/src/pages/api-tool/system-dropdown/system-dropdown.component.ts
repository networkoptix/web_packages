import { Component } from '@angular/core';

import {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import { environment } from '@environments/environment';
import { NxSystemService } from '@services/system.service';

import { APIDropdownItem } from '../api-tool-types';
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

    onSystemChange(system: DropdownItem) {
        this.APIToolService.menuNodes = undefined;
        this.APIToolService.system = this.systemService.createSystem('', system.value as string);
        this.APIToolService.APIDropdown = [];
        this.APIToolService.selectedSystem = system;
        this.APIToolService.outDatedSystem = false;
        this.APIToolService.handleSystemChange();
    }

    onServerChange(server) {
    }

    onAPIVersionChange(api: APIDropdownItem) {
        this.APIToolService.selectedAPI = api;
        this.APIToolService.setAPIInfo();
        this.APIToolService.menuNodes = api.menu;
    }
}
