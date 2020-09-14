import { Component }                 from '@angular/core';
import { BehaviorSubject }           from 'rxjs';

import { BaseDropdown }              from '../../dropdowns/injDropdown';
import { environment }               from '../../../../environments/environment';
import { MenuNode }                  from '../../../services/menus.service';
import { NxConfigService }           from '../../../services/nx-config';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { NxHeaderService }           from '../../../services/nx-header.service';

@Component({
    selector    : 'nx-nav-dropdown',
    templateUrl : 'nav-dropdown.component.html',
    styleUrls   : [environment.isLocal ? 'nav-dropdown-webadmin.component.scss' : 'nav-dropdown.component.scss']
})
export class NxNavDropdownComponent extends BaseDropdown {
    name = new BehaviorSubject('');
    nodes = new BehaviorSubject<MenuNode[]>([])
    path = ''
    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        public headerService: NxHeaderService
    ) {
        super(languageService, configService);
        headerService.currentLocation$.subscribe(({ path, parentNode }) => {
            this.path = path;
            const nodes = parentNode?.nodes;
            if (!nodes) {
                return;
            }

            const node = nodes.find(({ url }) => {
                return url === path;
            });
            if (node) {
                this.name.next(node.name);
            }

            this.nodes.next(nodes);
        });
    }

    hide() {
        this.show = false;
        return false;
    }

    get hideDropdown() {
        return this.nodes.value.length < 2;
    }
}
