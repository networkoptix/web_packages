import { Component }                 from '@angular/core';
import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxSystemService }           from '@services/system.service';
import { NxAPIToolService }          from '../api-tool.service';

@Component({
    selector    : 'nx-system-dropdown',
    templateUrl : './system-dropdown.component.html',
    styleUrls   : ['./system-dropdown.component.scss']
})
export class NxSystemDropdownComponent {
    CONFIG: IConfig

    constructor(public APIToolService: NxAPIToolService, private systemService: NxSystemService, private configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }

    onSystemChange(system) {
        this.APIToolService.leftMenuContent = undefined;
        this.APIToolService.system = this.systemService.createSystem('', system.value);
        this.APIToolService.selectedSystem = { value: system.value, name: system.name };
        this.APIToolService.getServersInfo();
    }

    onServerChange(server) {

    }
}
