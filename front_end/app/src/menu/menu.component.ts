import {
    Component, ElementRef, HostListener, Input, OnChanges, OnInit,
    SimpleChanges, ViewChild, ViewEncapsulation, EventEmitter, Output
} from '@angular/core';
import { ActivatedRoute, Router }      from '@angular/router';
import { fromEvent, SubscriptionLike } from 'rxjs';

import { NxConfigService, IConfig }         from '@services/nx-config';
import { NxMenuService }                    from './menu.service';
import { NxLanguageProviderService }        from '@services/nx-language-provider';
import { NxUtilsService }                   from '@services/utils.service';
import { ButtonArrowType, NxSearchService } from '@services/search.service';
import { NxSystem }                         from '@services/system.service';
import { LanguageI18NStaticTypes }          from '@app/language_i18n_static_types';
import { UntilDestroy }                     from '@ngneat/until-destroy';
import { map, startWith }                   from 'rxjs/operators';
import { NxApplyService }                   from '@services/apply.service';

/* Usage
 <nx-menu>
 </nx-menu>
 */

const SCROLL_AREA_LIMIT = 120;

@UntilDestroy()
@Component({
    selector      : 'nx-menu',
    templateUrl   : 'menu.component.html',
    styleUrls     : ['menu.component.scss'],
    encapsulation : ViewEncapsulation.None
})
export class NxMenuComponent implements OnInit, OnChanges {
    @Input() system: NxSystem;
    @Input() content;
    @Input() searchable;
    @Input() autoFit = false;

    @Output() menuSearchMode = new EventEmitter();
    @Output() contentToggle = new EventEmitter();

    systemId;
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
    windowHeight: number;
    menuHeight: number;

    scrollHeight: number;
    menuHeightFit: string;
    menuOverflow: string;
    containerHeight: number;
    scrollHeightFit: string;
    permHeight: number;
    menuInit: boolean;

    private routeParamsSubscription: SubscriptionLike;
    private navDirectionSubscription: SubscriptionLike;
    private navSelectionSubscription: SubscriptionLike;
    private resizeSubscription: SubscriptionLike;
    private applyOnNavSubscription: SubscriptionLike;

    private origLevel1: string;
    private origLevel2: string;
    private origLevel3: string;

    private menuOverflowCalc;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @ViewChild('menuWrapper') menuWrapper: ElementRef;
    @ViewChild('scrollArea') scrollArea: ElementRef;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private router: Router,
        private route: ActivatedRoute,
        public menuService: NxMenuService,
        private searchService: NxSearchService,
        private applyService: NxApplyService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;

        this.searchMode = false;
        this.isSearchable = false;
        this.toggle = false;
    }

    ngOnInit() {
        this.menuModel = {
            query: ''
        };

        this.isSearchable = this.searchable || false;

        this.routeParamsSubscription = this.route
            .queryParams
            .subscribe(params => {
                if (this.isSearchable) {
                    this.transition = true;
                    this.searchMode = this.menuModel.query !== '';
                    this.menuModel.query = params?.search || '';
                    this.searchService.getMatchPatterns(this.menuModel);
                    this.modelChanged(this.menuModel);
                }
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
                    this.navItemIdx = (this.navItemIdx < this.navItems.length - 1) ? ++this.navItemIdx : 0;
                    this.menuService.navItemId = this.navItems[this.navItemIdx].id;
                    this.router
                        .navigate([`${this.content.base}/${item.path}`], { queryParams: { search: this.menuModel.query } })
                        .catch((ex) => {
                            console.error(ex);
                        });
                }
            });

        this.resizeSubscription = fromEvent(window, 'resize').pipe(
            map((event: any) => event.target.innerHeight as number),
            startWith(window.innerHeight)
        ).subscribe(height => {
            this.windowHeight = height - 64; // 48px header and 1rem padding
            this.resizeMenu();
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.content.currentValue) {
            const sanitizedContent = this.menuService.sanitizeContent(changes.content.currentValue.level1);
            if (this.menuService.hasUpdatedContent(sanitizedContent)) {
                this.menuService.content = sanitizedContent;
                this.menuInit = true;
            }
            // Avoid unnecessary update and overwrite user choices
            const filtered = this.menuService.cleanMenuContent(this.menuService.filterItemsBy(this.menuModel));
            const cleanMenuContent = this.menuService.cleanMenuContent(this.menuContent);
            if (filtered.length !== this.menuContent.length || !NxUtilsService.isEqual(filtered, cleanMenuContent)) {
                this.menuContent = filtered;
            }

            if (this.selectedLevel1 !== changes.content.currentValue.selectedSection) {
                if (this.autoFit) {
                    this.menuInit = true;
                }

                if (this.applyService.locked) {
                    this.origLevel1 = this.selectedLevel1;
                    this.origLevel2 = this.selectedLevel2;
                    this.origLevel3 = this.selectedLevel3;

                    if (this.applyOnNavSubscription) {
                        this.applyOnNavSubscription.unsubscribe();
                    }

                    this.applyOnNavSubscription = this.applyService.applyOnNavSubject.subscribe(status => {
                        if (status === 'canceled') {
                            this.selectedLevel1 = this.origLevel1;
                            this.selectedLevel2 = this.origLevel2;
                            this.selectedLevel3 = this.origLevel3;
                        }
                    });
                }
            }

            if (!this.applyService.locked) {
                this.selectedLevel1 = changes.content.currentValue.selectedSection;
                this.selectedLevel2 = changes.content.currentValue.selectedSubSection;
                this.selectedLevel3 = changes.content.currentValue.selectedDetailsSection;
            }

            this.transition = false;

            if (!this.applyService.locked && changes.content.currentValue.selectedSection) {
                this.systemId = changes.content.currentValue.system?.id;

                if (this.autoFit && this.scrollArea && !this.searchMode) {
                    if (!this.menuInit) {
                        return;
                    }
                    this.menuHeightFit = '';
                    this.scrollHeightFit = '';
                    setTimeout(() => {
                        this.menuInit = false;
                        this.getMenuDimensions();
                        this.resizeMenu();
                    });
                }
            }
        }

        if (changes.searchable) {
            this.isSearchable = changes.searchable.currentValue;
        }
    }

    ngAfterViewInit() {
        this.getMenuDimensions();
    }

    getMenuDimensions() {
        // scroll area parent is "level-3-items" and their parent is "level-1-container"
        // the idea is to calculate menu height by setting "level-3-items" height to number to which
        // when we add number of level1 nodes multiplied by level1 node height plus difference between
        // "level-1-container" height and scroll area height to reach window height
        // ... I cannot repeat this sentence 10 times in a row -- TT

        if (this.autoFit && this.scrollArea && this.menuModel.query === '') {
            this.menuHeight = this.menuWrapper.nativeElement.scrollHeight; // getBoundingClientRect().height;
            this.scrollHeight = this.scrollArea.nativeElement.getBoundingClientRect().height;

            this.containerHeight = this.scrollArea.nativeElement.parentNode.parentNode.getBoundingClientRect().height;
            // this.menuService.content.length - 1 -> the number of other level1 nodes
            this.permHeight = (this.menuService.content.length - 1) * 40 + (this.containerHeight - this.scrollHeight);
        }
    }

    resizeMenu() {
        if (this.autoFit && this.scrollArea && !this.searchMode) {
            setTimeout(() => {
                let windowHeightFit;
                this.menuOverflow = 'hidden';

                if (this.windowHeight < this.menuHeight + 40) { // + 40 for search box
                    // TODO: might want to subtract more if ribbon exists
                    windowHeightFit = this.windowHeight - 40/* search box */ - 16/* bottom padding */;
                } else {
                    windowHeightFit = this.menuHeight;
                }
                this.menuHeightFit = windowHeightFit + 'px';

                // 120px is the min height for taller scrollArea - keep height if shorter
                if (this.scrollArea.nativeElement.scrollHeight > SCROLL_AREA_LIMIT) {
                    this.scrollHeightFit = Math.max(SCROLL_AREA_LIMIT, (windowHeightFit - this.permHeight)) + 'px';
                } else {
                    this.scrollHeightFit = this.scrollArea.nativeElement.scrollHeight;
                }

                // set scrollbar if needed but only after resizing finishes
                clearTimeout(this.menuOverflowCalc);
                this.menuOverflowCalc = setTimeout(() => {
                    const magicNumberToAdd  = 40/* search box */ + 2 * 16/* bottom and top padding */;
                    this.menuOverflow = (windowHeightFit + magicNumberToAdd > this.windowHeight) ? 'auto' : 'hidden';
                }, 250);
            });
        }
    }

    resetNav() {
        this.navItemIdx = -1;
        this.menuService.hoverItemId = undefined;
        this.menuService.navItemId = undefined;
    }

    setNav() {
        this.modelChanged(this.menuModel, false);
    }

    private assignItemId() {
        if (this.menuService.hoverItemId) {
            this.navItemIdx = this.navItems.findIndex((item: any) => item.id === this.menuService.hoverItemId);
            // remove info for hovered item
            this.menuService.hoverItemId = undefined;
        }

        if (this.searchService.navDirection === ButtonArrowType.up) {
            this.navItemIdx = (this.navItemIdx > 0) ? --this.navItemIdx : this.navItems.length - 1;
        } else {
            this.navItemIdx = (this.navItemIdx < this.navItems.length - 1) ? ++this.navItemIdx : 0;
        }

        return this.navItems[this.navItemIdx].id;
    }

    modelChanged(model, resetLayout = true) {
        this.searchMode = (this.isSearchable && this.menuModel.query !== '');
        this.menuSearchMode.emit(this.searchMode);
        this.transition = true;
        this.menuModel = model;
        this.transition = false;

        // clear toggled items and update menu content
        // setNav(igation) have same model so we have to preserve the layout
        // and avoid unnecessary content update
        if (resetLayout) {
            this.menuContent.forEach((node, index, arr) => {
                this.toggleItem(false, node.id);
            });
            this.menuContent = this.menuService.filterItemsBy(model);
        }

        this.navItemIdx = -1;
        this.menuService.hoverItemId = undefined;
        this.menuService.navItemId = undefined;

        this.navItems = [];
        if (this.searchMode) {
            setTimeout(() => { // Avoid selection before filter finishes
                // reset height auto fit
                this.menuHeightFit = '100%';
                this.scrollHeightFit = '100%';
                this.menuOverflow = 'auto';
                this.navItems = Array.from(this.menuWrapper.nativeElement.querySelectorAll('.menu-level-3'));
            });
        } else {
            this.menuHeightFit = '';
            this.scrollHeightFit = '';
            setTimeout(() => {
                this.getMenuDimensions();
                this.resizeMenu();
            });
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

        if (buttons.items?.length) {
            buttons = buttons.items;
        }

        return buttons;
    }

    trackItem(index, item) {
        return item ? item.id : undefined;
    }

    toggleItem(state, nodeId) {
        // menu have internal state but also is controlled by parent component
        // so we need to update both states
        this.menuContent.find((node) => {
            if (node.id === nodeId) {
                node.toggle = state;
            }
        });
        this.contentToggle.emit({ nodeId, state });
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
