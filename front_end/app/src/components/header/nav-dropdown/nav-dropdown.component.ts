import { Component, ElementRef, Inject, ViewChild }                 from '@angular/core';
import { BehaviorSubject }           from 'rxjs';

import { BaseDropdown }              from '../../dropdowns/injDropdown';
import { environment }               from '../../../../environments/environment';
import { MenuNode }                  from '../../../services/menus.service';
import { NxConfigService }           from '../../../services/nx-config';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { NxHeaderService }           from '../../../services/nx-header.service';
import { WINDOW } from '../../../services/window-provider';

@Component({
    selector    : 'nx-nav-dropdown',
    templateUrl : 'nav-dropdown.component.html',
    styleUrls   : [environment.isLocal ? 'nav-dropdown-webadmin.component.scss' : 'nav-dropdown.component.scss']
})
export class NxNavDropdownComponent extends BaseDropdown {
    @ViewChild('dropDownButton') dropDownButton: ElementRef
    name = new BehaviorSubject('');
    nodes = new BehaviorSubject<MenuNode[]>([])
    path = ''
    offset = 0;
    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        public headerService: NxHeaderService,
        @Inject(WINDOW) private window: Window
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

    updateOffset() {
        this.offset = this.window.innerWidth > 420 ? 0 : -this.dropDownButton.nativeElement.getBoundingClientRect().left;
    }

    get hideDropdown() {
        return this.nodes.value.length < 2;
    }
}
