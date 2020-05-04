import {
    Component, Input, OnChanges,
    SimpleChanges, ViewEncapsulation
}                                   from '@angular/core';
import { NxConfigService, IConfig } from '../../services';

/* Usage
 <nx-menu>
 </nx-menu>
 */

@Component({
    selector     : 'nx-menu',
    templateUrl  : 'menu.component.html',
    styleUrls    : ['menu.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxMenuComponent implements OnChanges {
    @Input() content: any;

    systemId: any;
    selectedLevel1: string;
    selectedLevel2: string;
    selectedLevel3: string;

    CONFIG: IConfig;

    constructor(configService: NxConfigService
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.content.currentValue) {
            this.selectedLevel1 = changes.content.currentValue.selectedSection;
            this.selectedLevel2 = changes.content.currentValue.selectedSubSection;
            this.selectedLevel3 = changes.content.currentValue.selectedDetailsSection;
        }

        if (changes.content.currentValue.selectedSection) {
            this.systemId = changes.content.currentValue.systemId;
        }
    }

    subLevelItemsFor(item) {
        let levelItems = [];

        // To avoid complicated code this cover only level2 for now ...
        // as only level2 have complex structure
        if (item.level2) {
            levelItems = item.level2.filter((subSection) => {
                return !this.CONFIG || subSection.id !== this.CONFIG.menus.systemSettings.buttons.id;
            });
        }

        return levelItems;
    }

    subLevelButtonsFor(item) {
        let buttons: any = [];

        // To avoid complicated code this cover only level2 for now ...
        // as only level2 have complex structure
        if (item.level2) {
            buttons = item.level2.filter((subSection) => {
                return this.CONFIG && subSection.id === this.CONFIG.menus.systemSettings.buttons.id;
            })[0] || [];
        }

        if (buttons.items && buttons.items.length) {
            buttons = buttons.items;
        }

        return buttons;
    }

    trackItem(index, item) {
        return item ? item.id : undefined;
    }

    // *** Breadcrumb for usage of named (auxiliary) router outlet
    // usage: [routerLink]="getItemLink(item)"
    // getItemLink(item){
    //     return [{outlets: { [item.target || 'primary'] : [item.path]}}];
    // }
}
