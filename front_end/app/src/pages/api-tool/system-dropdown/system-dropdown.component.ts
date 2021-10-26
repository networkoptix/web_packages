import { Component }                 from '@angular/core';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component';
import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxSystemService }           from '@services/system.service';
import { NxAPIToolService }          from '../api-tool.service';
import { APIDropdownItem } from '../api-tool-types';

@Component({
    selector: 'nx-system-dropdown',
    templateUrl: './system-dropdown.component.html',
    styleUrls: ['./system-dropdown.component.scss']
})
export class NxSystemDropdownComponent {
    CONFIG: IConfig

    constructor(public APIToolService: NxAPIToolService, private systemService: NxSystemService, private configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }

    onSystemChange(system: DropdownItem) {
        this.APIToolService.menuNodes = undefined;
        this.APIToolService.system = this.systemService.createSystem('', system.value as string);
        this.APIToolService.APIDropdown = [];
        this.APIToolService.selectedSystem = system;
        this.APIToolService.getServersInfo();
    }

    onServerChange(server) {
    }

    onAPIVersionChange(api: APIDropdownItem) {
        this.APIToolService.menuNodes = api.menu;
        this.APIToolService.activeNode = api.menu[0];
        this.APIToolService.selectedAPI = api;
        this.APIToolService.setAPIInfo();
    }
}
