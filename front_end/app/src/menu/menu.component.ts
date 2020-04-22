import {
    Component, Input, OnChanges, OnInit,
    SimpleChanges, ViewEncapsulation
}                                    from '@angular/core';
import { NxConfigService, IConfig }  from '../services/nx-config';
import { NxLanguageProviderService } from '../services/nx-language-provider';
import { LanguageI18NStaticTypes }   from '../../language_i18n_static_types';
import { SubscriptionLike }          from 'rxjs';
import { ActivatedRoute }            from '@angular/router';

/* Usage
 <nx-menu>
 </nx-menu>
 */

@Component({
    selector      : 'nx-menu',
    templateUrl   : 'menu.component.html',
    styleUrls     : ['menu.component.scss'],
    encapsulation : ViewEncapsulation.None
})
export class NxMenuComponent implements OnInit, OnChanges {
    @Input() content: any;
    @Input() searchable: any;

    systemId: any;
    selectedLevel1: string;
    selectedLevel2: string;
    selectedLevel3: string;
    isSearchable: boolean;
    transition: boolean;

    menuQuery: string;
    routeParamsSubscription: SubscriptionLike;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private route: ActivatedRoute,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();

        this.isSearchable = false;
    }

    ngOnInit() {
        this.menuQuery = '';
        this.isSearchable = (this.searchable !== undefined);

        this.routeParamsSubscription = this.route
            .queryParams
            .subscribe(params => {
                if (params.search) {
                    this.menuQuery = params.search;
                }
            });
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

    modelChanged(model) {
        const delay = model.query ? this.CONFIG.search.transitionInMs : this.CONFIG.search.transitionShortInMs;
        this.transition = true;
        this.selectedLevel3 = '';

        setTimeout(() => {
            // create an illusion for search transition
            this.menuQuery = model.query;
            // this.searchMenu();
            this.transition = false;
        }, delay);
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
