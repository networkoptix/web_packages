import {
    Component,
    ElementRef,
    HostListener,
    Input,
    OnChanges,
    OnInit,
    ViewChild,
    ViewEncapsulation,
    EventEmitter,
    Output,
    Inject,
    Renderer2,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { cloneDeep, isEqual } from 'lodash-es';
import { fromEvent, Subject } from 'rxjs';
import { distinctUntilChanged, map, startWith, takeUntil } from 'rxjs/operators';

import { IBool, CoercedBoolInput } from '@decorators/ibool';
import { NxApplyService } from '@services/apply.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxSearchService } from '@services/search.service';
import { ButtonArrowType, SearchModel } from '@services/search.service.types';
import type { NxSystem } from '@services/system.service/system';
import { WINDOW } from '@services/window-provider';
import type { NgChanges } from '@utils/ng-changes';

import { menus } from '../variables/static-variables';

import { NxMenuService } from './menu.service';
import type {
    ContentToggle,
    Content,
    Level1Item,
    Level2Item,
    Level2Button,
    Level3Item,
} from './menu.types';

/* Usage
 <nx-menu>
 </nx-menu>
*/

const SCROLL_AREA_LIMIT = 120;

@UntilDestroy()
@Component({
    selector: 'nx-menu',
    templateUrl: 'menu.component.html',
    styleUrls: ['menu.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxMenuComponent implements OnInit, OnChanges {
    @Input() system: NxSystem;
    @Input() content: Content;
    @IBool() @Input() searchable: CoercedBoolInput;
    @Input() autoFit: boolean = false;

    @Output() menuSearchMode = new EventEmitter<boolean>();
    @Output() contentToggle = new EventEmitter<ContentToggle>();

    selectedLevel1: string;
    selectedLevel2: string;
    selectedLevel3: string;
    searchMode: boolean = false;
    transition: boolean;
    toggle: boolean = false;

    menuContent: Level1Item[] = [];
    menuModel: SearchModel = { query: '' };
    navItems: HTMLAnchorElement[] = [];
    navItemIdx: number;
    totalWindowHeight: number;
    windowHeight: number;
    menuHeight: number;

    scrollHeight: number;
    menuHeightFit: string;
    menuOverflow: string;
    containerHeight: number;
    scrollHeightFit: string;
    permHeight: number;
    menuInit: boolean;
    ribbonShown: boolean = false;

    elmRibbon: HTMLDivElement;
    elmMenuL1: HTMLDivElement;
    elmHeader: HTMLElement;
    elmMenuSearch: HTMLElement;
    stdPadding = 16; // baseline rem

    private unsub$ = new Subject<boolean>();
    private origLevel1: string;
    private origLevel2: string;
    private origLevel3: string;
    private menuOverflowCalc: number;

    @ViewChild('menuWrapper') menuWrapper: ElementRef<HTMLDivElement>;
    @ViewChild('scrollArea') scrollArea: ElementRef<HTMLDivElement>;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private renderer: Renderer2,
        private searchService: NxSearchService,
        private applyService: NxApplyService,
        private appStateService: NxAppStateService,
        public menuService: NxMenuService,
        @Inject(WINDOW) private window: Window,
    ) {
    }

    ngOnInit(): void {
        this.route.queryParams
            .pipe(untilDestroyed(this))
            .subscribe(params => {
                if (this.searchable) {
                    this.transition = true;
                    this.searchMode = this.menuModel.query !== '';
                    this.menuModel.query = params?.search || '';
                    this.searchService.getMatchPatterns(this.menuModel);
                    this.modelChanged(this.menuModel);
                }
            });

        this.searchService.navDirectionSubject
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                if (this.navItems.length) {
                    this.menuService.navItemId = this.assignItemId();
                    // skip selected item
                    if (this.menuService.navItemId === this.selectedLevel3) {
                        this.menuService.navItemId = this.assignItemId();
                    }
                }
            });

        this.searchService.navSelectionSubject
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                const item = this.menuService.getItemBy(
                    this.navItems[this.navItemIdx].id
                );
                if (item) {
                    this.navItemIdx = (this.navItemIdx < this.navItems.length - 1)
                        ? this.navItemIdx + 1
                        : 0;
                    this.menuService.navItemId = this.navItems[this.navItemIdx].id;
                    this.router
                        .navigate(
                            [`${this.content.base}/${item.path}`],
                            { queryParams: { search: this.menuModel.query } }
                        ).catch(ex => {
                            console.error(ex);
                        });
                }
            });

        fromEvent<Event>(this.window, 'resize')
            .pipe(
                untilDestroyed(this),
                map(event => (event.target as Window).innerHeight),
                startWith(this.window.innerHeight)
            ).subscribe(height => {
                this.totalWindowHeight = height;
                if (this.ribbonShown) {
                    this.windowHeight = this.windowHeight - this.elmRibbon.offsetHeight;
                }
                this.resizeMenu();
            });

        this.appStateService.ribbonSubject
            .pipe(
                distinctUntilChanged(),
                untilDestroyed(this)
            )
            .subscribe(state => {
                if (state) {
                    this.elmRibbon = this.renderer?.selectRootElement('nx-ribbon', true);
                }
                if (!this.ribbonShown && state) {
                    this.windowHeight = this.windowHeight - this.elmRibbon.offsetHeight;
                }
                if (this.ribbonShown && !state) {
                    this.windowHeight = this.windowHeight + this.elmRibbon.offsetHeight;
                }
                this.ribbonShown = state;
                this.resizeMenu();
            });
    }

    ngOnChanges(changes: NgChanges<NxMenuComponent>): void {
        const currentContent = changes.content?.currentValue;
        if (currentContent) {
            if (!isEqual(currentContent.level1, this.menuService.content)) {
                this.menuService.content = cloneDeep(currentContent.level1);
                this.menuInit = true;
            }
            // Avoid unnecessary update and overwrite user choices
            const filtered = this.menuService.cleanMenuContent(
                this.menuService.filterItemsBy(this.menuModel)
            );
            const cleanMenuContent = this.menuService.cleanMenuContent(
                this.menuContent
            );
            if (
                filtered.length !== this.menuContent.length ||
                !isEqual(filtered, cleanMenuContent)
            ) {
                const scroll = this.scrollArea?.nativeElement.scrollTop || 0;
                this.menuContent = filtered;
                setTimeout(() => {
                    if (
                        this.scrollArea &&
                        this.scrollArea.nativeElement.scrollHeight > this.scrollArea.nativeElement.clientHeight
                    ) {
                        this.scrollArea.nativeElement.scrollTop = scroll;
                    }
                });
            }

            if (this.selectedLevel1 !== currentContent.selectedSection) {
                if (this.autoFit) {
                    this.menuInit = true;
                }

                if (this.applyService.locked) {
                    this.origLevel1 = this.selectedLevel1;
                    this.origLevel2 = this.selectedLevel2;
                    this.origLevel3 = this.selectedLevel3;

                    this.unsub$.next(true);
                    this.applyService.applyOnNavSubject
                        .pipe(takeUntil(this.unsub$))
                        .subscribe(status => {
                            if (status === 'canceled') {
                                this.selectedLevel1 = this.origLevel1;
                                this.selectedLevel2 = this.origLevel2;
                                this.selectedLevel3 = this.origLevel3;
                            }
                        });
                }
            }

            if (!this.applyService.locked) {
                this.selectedLevel1 = currentContent.selectedSection;
                this.selectedLevel2 = currentContent.selectedSubSection;
                this.selectedLevel3 = currentContent.selectedDetailsSection;
            }

            this.transition = false;

            if (
                !this.applyService.locked &&
                currentContent.selectedSection &&
                this.autoFit &&
                !this.searchMode
            ) {
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

    getMenuDimensions(): void {
        try {
            this.elmHeader = this.renderer.selectRootElement('nx-header header', true);
        } catch (e) {
            return;
        }
        this.windowHeight = this.totalWindowHeight - this.elmHeader.offsetHeight - this.stdPadding;
        if (this.searchable) {
            this.elmMenuSearch = this.renderer.selectRootElement('nx-search', true);
        }

        // scroll area parent is "level-3-items" and their parent is "level-1-container"
        // the idea is to calculate menu height by setting "level-3-items" height to number to which
        // when we add number of level1 nodes multiplied by level1 node height plus difference between
        // "level-1-container" height and scroll area height to reach window height
        // ... I cannot repeat this sentence 10 times in a row -- TT

        if (this.autoFit && this.menuModel.query === '') {
            this.menuHeight = this.menuWrapper.nativeElement.scrollHeight; // getBoundingClientRect().height;
            this.scrollHeight = this.scrollArea
                ? this.scrollArea.nativeElement.getBoundingClientRect().height
                : 0;

            this.containerHeight = this.scrollArea
                ? (this.scrollArea.nativeElement // .scroll-area
                    .parentNode // .level-3-items
                    .parentNode as HTMLDivElement) // .level-1-container
                    .getBoundingClientRect().height
                : 0;
            try {
                this.elmMenuL1 = this.renderer.selectRootElement('.level-1-container:not(.selected)', true);
                // this.menuService.content.length - 1 -> the number of other level1 nodes
                this.permHeight = (this.menuService.content.length - 1) * this.elmMenuL1.offsetHeight +
                    (this.containerHeight - this.scrollHeight);
            } catch (_) {
                // element does not exist
            }
        }
    }

    resizeMenu(): void {
        if (this.elmHeader && this.elmMenuSearch && this.autoFit && this.scrollArea && !this.searchMode) {
            setTimeout(() => {
                let windowHeightFit: number;
                this.menuOverflow = 'hidden';
                this.windowHeight = this.totalWindowHeight - this.elmHeader.offsetHeight - this.stdPadding;

                const actualSearchHeight = !this.searchable ? 0 : this.elmMenuSearch.offsetHeight + this.stdPadding / 2;
                if (this.windowHeight < this.menuHeight + actualSearchHeight) {
                    // TODO: might want to subtract more if ribbon exists
                    windowHeightFit = this.windowHeight - actualSearchHeight - this.stdPadding;
                } else {
                    windowHeightFit = this.menuHeight;
                }
                this.menuHeightFit = `${windowHeightFit}px`;

                // 120px is the min height for taller scrollArea - keep height if shorter
                if (this.scrollArea.nativeElement.scrollHeight > SCROLL_AREA_LIMIT) {
                    const heightFit = Math.max(
                        SCROLL_AREA_LIMIT,
                        (windowHeightFit - this.permHeight)
                    );
                    this.scrollHeightFit = `${heightFit}px`;
                } else {
                    this.scrollHeightFit =
                        this.scrollArea.nativeElement.scrollHeight.toString();
                }

                // set scrollbar if needed but only after resizing finishes
                clearTimeout(this.menuOverflowCalc);
                this.menuOverflowCalc = this.window.setTimeout(() => {
                    const magicNumberToAdd = actualSearchHeight + 2 * this.stdPadding; // bottom and top padding
                    this.menuOverflow = (windowHeightFit + magicNumberToAdd > this.windowHeight)
                        ? 'auto'
                        : 'hidden';
                }, 250);
            });
        }
    }

    resetNav(): void {
        this.navItemIdx = -1;
        this.menuService.hoverItemId = undefined;
        this.menuService.navItemId = undefined;
    }

    setNav(): void {
        this.modelChanged(this.menuModel, false);
    }

    private assignItemId(): string {
        if (this.menuService.hoverItemId) {
            this.navItemIdx = this.navItems.findIndex(item =>
                item.id === this.menuService.hoverItemId
            );
            // remove info for hovered item
            this.menuService.hoverItemId = undefined;
        }

        if (this.searchService.navDirection === ButtonArrowType.up) {
            this.navItemIdx = (this.navItemIdx > 0)
                ? this.navItemIdx - 1
                : this.navItems.length - 1;
        } else {
            this.navItemIdx = (this.navItemIdx < this.navItems.length - 1)
                ? this.navItemIdx + 1
                : 0;
        }

        return this.navItems[this.navItemIdx].id;
    }

    modelChanged(model: SearchModel, resetLayout = true): void {
        this.searchMode = (this.searchable && this.menuModel.query !== '');
        this.menuSearchMode.emit(this.searchMode);
        this.transition = true;
        this.menuModel = model;
        this.transition = false;

        // clear toggled items and update menu content
        // setNav() have same model so we have to preserve the layout
        // and avoid unnecessary content update
        if (resetLayout) {
            this.menuContent.forEach(node => this.toggleItem(false, node.id));
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
                this.navItems = Array.from(
                    this.menuWrapper.nativeElement
                        .querySelectorAll<HTMLAnchorElement>('.menu-level-3')
                );
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

    subLevelItemsFor(item: Level1Item): Level2Item[] {
        // To avoid complicated code this cover only level2 for now ...
        // as only level2 have complex structure
        const levelItems = item.level2?.filter(subSection =>
            subSection.id !== menus.systemSettings.buttons.id
        );

        return levelItems ?? [];
    }

    subLevelButtonsFor(item: Level1Item): Level2Button[] {
        // To avoid complicated code this cover only level2 for now ...
        // as only level2 have complex structure
        const level2Item = item.level2?.find(subSection =>
            subSection.id === menus.systemSettings.buttons.id
        );

        return level2Item?.items ?? [];
    }

    trackItem(
        _index: number,
        item: Level1Item | Level2Item | Level3Item,
    ): string | undefined {
        return item ? item.id : undefined;
    }

    toggleItem(state: boolean, nodeId: string): void {
        // menu have internal state but also is controlled by parent component
        // so we need to update both states
        this.menuContent.find(node => node.id === nodeId).toggle = state;
        this.contentToggle.emit({ nodeId, state });
    }

    @HostListener('mousemove', ['$event'])
    onMouseMove(_event: MouseEvent): void {
        this.menuService.navItemId = undefined;
    }

    // *** Breadcrumb for usage of named (auxiliary) router outlet
    // usage: [routerLink]="getItemLink(item)"
    // getItemLink(item){
    //     return [{outlets: { [item.target || 'primary'] : [item.path]}}];
    // }
}
