import { Component, Input }          from '@angular/core';
import { NxConfigService }           from '../../../services/nx-config';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { BaseDropdown } from '../../dropdowns/injDropdown';
import { NxHeaderService } from '../../../services/nx-header.service';
import { filter } from 'rxjs/operators';
import { MenuNode } from '../../dropdowns/drop-menu/navigation-tile/navigation-tile.component';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
    selector   : 'nx-nav-dropdown',
    templateUrl: 'nav-dropdown.component.html',
    styleUrls  : [environment.isLocal ? 'nav-dropdown-webadmin.component.scss' : 'nav-dropdown.component.scss']
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
            };
            this.name.next(nodes.find(({ url }) => url === path)?.name);
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
