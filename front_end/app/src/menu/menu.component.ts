import {
    Component, ElementRef, HostListener, Input, OnChanges, OnInit,
    SimpleChanges, ViewChild, ViewEncapsulation
} from '@angular/core';
import { SubscriptionLike }         from 'rxjs';
import { ActivatedRoute, Router }   from '@angular/router';
import { NxConfigService, IConfig } from '../services/nx-config';
import { LanguageI18NStaticTypes }  from '../../language_i18n_static_types';
import { NxMenuService }            from './menu.service';
import {
    NxLanguageProviderService,
    NxUtilsService, NxSearchService, NxSystem, ButtonArrowType
} from '../services';

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
    @Input() system: NxSystem;
    @Input() content: any;
    @Input() searchable: any;

    systemId: any;
    selectedLevel1: string;
    selectedLevel2: string;
    selectedLevel3: string;
    isSearchable: boolean;
    searchMode: boolean;
    transition: boolean;
    toggle: boolean;

    menuContent: any = [];
    menuModel: any = {};
    navItems: any = [];
    navItemIdx: number;

    routeParamsSubscription: SubscriptionLike;
    navDirectionSubscription: SubscriptionLike;
    navSelectionSubscription: SubscriptionLike;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @ViewChild('menuWrapper') menuWrapper: ElementRef;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private router: Router,
        private route: ActivatedRoute,
        private menuService: NxMenuService,
        private searchService: NxSearchService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();

        this.searchMode = false;
        this.isSearchable = false;
        this.toggle = false;
    }

    ngOnInit() {
        this.menuModel = {
            query: ''
        };
        this.isSearchable = (this.searchable !== undefined);

        this.routeParamsSubscription = this.route
            .queryParams
            .subscribe(params => {
                this.menuModel.query = params?.search ?? '';
                this.searchMode = (this.isSearchable && this.menuModel.query !== '');
                NxSearchService.getMatchPatterns(this.menuModel);
                this.menuContent = this.menuService.fillerItemsBy(this.menuModel);
            });

        this.navDirectionSubscription = this.searchService.navDirectionSubject
            .subscribe(() => {
                if (this.navItems.length) {
                    this.menuService.navItemId = this.assignItemId();
                    // skip selected item
                    if (this.menuService.navItemId === this.selectedLevel3) {
                        this.menuService.navItemId = this.assignItemId();
                    }
                }
            });

        this.navSelectionSubscription = this.searchService.navSelectionSubject
            .subscribe(() => {
                const item = this.menuService.getItemBy(this.navItems[this.navItemIdx].id);
                if (item) {
                    this.router
                        .navigate([`${this.content.base}/${item.path}`], { queryParams: { search: this.menuModel.query } })
                        .catch((ex) => {
                            console.error(ex);
                        });
                }
            });
    }

    resetNav() {
        this.navItemIdx = 0;
        this.menuService.navItemId = undefined;
    }

    setNav() {
        this.modelChanged(this.menuModel);
    }

    private assignItemId() {
        if (this.searchService.navDirection === ButtonArrowType.up) {
            this.navItemIdx = (this.navItemIdx > 0) ? --this.navItemIdx : this.navItems.length - 1;
        } else {
            this.navItemIdx = (this.navItemIdx < this.navItems.length - 1) ? ++this.navItemIdx : 0;
        }
        return this.navItems[this.navItemIdx].id;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.content.currentValue) {
            if (!NxUtilsService.isEqual(this.menuService.content, changes.content.currentValue.level1)) {
                this.menuService.content = changes.content.currentValue.level1;
            }

            // Avoid unnecessary update and overwrite user choices
            const filtered = this.menuService.fillerItemsBy(this.menuModel);
            const cleanMenuContent = this.menuService.cleanMenuContent(this.menuContent);
            if (filtered.length !== this.menuContent.length || !NxUtilsService.isEqual(filtered, cleanMenuContent)) {
                this.menuContent = filtered;
            }

            this.selectedLevel1 = changes.content.currentValue.selectedSection;
            this.selectedLevel2 = changes.content.currentValue.selectedSubSection;
            this.selectedLevel3 = changes.content.currentValue.selectedDetailsSection;
        }

        if (changes.content.currentValue.selectedSection) {
            this.systemId = changes.content.currentValue.systemId;
        }
    }

    modelChanged(model) {
        // create an illusion for search transition
        const delay = model.query ? this.CONFIG.search.transitionInMs : this.CONFIG.search.transitionShortInMs;
        this.transition = true;

        this.menuModel = model;

        setTimeout(() => {
            this.menuContent = this.menuService.fillerItemsBy(model);
            this.transition = false;

            this.navItems = [];
            if (model.query !== '') {
                this.navItems = this.menuWrapper.nativeElement.querySelectorAll('.menu-level-3');
                this.navItemIdx = 0;
                this.menuService.navItemId = this.navItems[this.navItemIdx].id;
            }
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

        if (buttons.items?.length) {
            buttons = buttons.items;
        }

        return buttons;
    }

    trackItem(index, item) {
        return item ? item.id : undefined;
    }

    toggleItem(state, idx) {
        this.menuContent[idx].toggle = state;
    }

    @HostListener('mousemove', ['$event'])
    onMouseMove(event: MouseEvent) {
        this.menuService.navItemId = undefined;
    }

    // *** Breadcrumb for usage of named (auxiliary) router outlet
    // usage: [routerLink]="getItemLink(item)"
    // getItemLink(item){
    //     return [{outlets: { [item.target || 'primary'] : [item.path]}}];
    // }
}
