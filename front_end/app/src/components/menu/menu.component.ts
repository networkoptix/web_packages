import {
    Component, ElementRef, Input, OnChanges,
    OnInit, SimpleChanges
}                          from '@angular/core';
import { NxConfigService } from '../../services/nx-config';

/* Usage
<nx-menu>
</nx-menu>
*/

@Component({
    selector: 'nx-menu',
    templateUrl: 'menu.component.html',
    styleUrls: ['menu.component.scss']
})
export class NxMenuComponent implements OnInit, OnChanges {
    @Input() content: any;

    systemId: any;
    selectedLevel1: string;
    selectedLevel2: string;
    selectedLevel3: string;

    CONFIG: any;

    section: any;
    buttons: any;

    level2: any = [];

    constructor(private configService: NxConfigService) {
        this.buttons = {};
        this.level2 = {
            items : []
        };
    }

    ngOnInit() {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.content.currentValue.selectedSection) {
            this.systemId = changes.content.currentValue.systemId;
            this.selectedLevel1 = changes.content.currentValue.selectedSection;
            this.selectedLevel2 = changes.content.currentValue.selectedSubSection;
            this.selectedLevel3 = changes.content.currentValue.selectedDetailsSection;
        }

        if (changes.content.currentValue) {
            this.section = changes.content.currentValue.level1.filter((level) => {
                if (level.id === changes.content.currentValue.selectedSection) {
                    return true;
                }
            })[0];

            if (this.section && this.section.level2) {
                this.buttons = this.section.level2.filter((subSection) => {
                    if (subSection.id === this.CONFIG.menu.buttons.id) {
                        return true;
                    }
                })[0] || [];

                if (this.buttons.items && this.buttons.items.length) {
                    this.buttons = this.buttons.items;
                }
                this.level2.items = this.section.level2.filter((subSection) => {
                    if (subSection.id !== this.CONFIG.menu.buttons.id) {
                        return true;
                    }
                });
            } else {
                this.buttons = [];
                this.level2.items = [];
            }
        }
    }

    // *** Breadcrumb for usage of named (auxiliary) router outlet
    // usage: [routerLink]="getItemLink(item)"
    // getItemLink(item){
    //     return [{outlets: { [item.target || 'primary'] : [item.path]}}];
    // }
}
