// import { Location } from '@angular/common';
import { Direction } from '@angular/cdk/bidi';
import {
    Component,
    OnInit,
    Input,
    forwardRef,
    ViewEncapsulation,
    OnDestroy,
    EventEmitter,
    Output,
    Inject
} from '@angular/core';
import {
    NG_VALUE_ACCESSOR,
    ControlValueAccessor
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { isEqual, cloneDeep } from 'lodash-es';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { IBool, CoercedBoolInput } from '@decorators/ibool';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxSearchService } from '@services/search.service';
import { ButtonArrowType } from '@services/search.service.types';
import { NxUriService } from '@services/uri.service';
import { WINDOW } from '@services/window-provider';

import type { SearchFilter } from './search.component.types';

/* Usage
 <nx-search
     name="NAME"
     [(ngModel)]="filterModel"
     (ngModelChange)="modelChanged($event)"
     layout?="[compact | full]"     <- DEFAULT to "full"
     [placeholder]?="placeholder"   <- DEFAULT to "Search"
     instant?                       <- no debounce for search criteria DEFAULT to CONFIG.search.debounceTime
     ngDefaultControl?>
 </nx-search>

 * "Selectors" layout (used in Health Monitor page)
 - will hide search box and toggle button
 - will show advanced search and selected filters buttons (tags)

 * "Compact" layout (used in Integration page)
 - will hide labels and adjust spacing
 - will not show advanced search and filters selected buttons

 * "Full" layout (used in IPVD page)
 - will show labels and adjust spacing
 - will show advanced search and selected filters buttons (tags)

 */

@UntilDestroy()
@Component({
    selector: 'nx-search',
    templateUrl: './search.component.html',
    encapsulation: ViewEncapsulation.None,
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        useExisting: forwardRef(() => NxSearchComponent),
        multi: true
    }],
    styleUrls: ['./search.component.scss']
})

export class NxSearchComponent implements OnInit, OnDestroy, ControlValueAccessor {
    @Input() layout: 'search' | 'selectors' | 'compact' | 'full' = 'full';
    @Input() layoutMod: boolean; // mod for 'selectors' layout (HM is using 100% width width Bootstrap) ... at some point we should unify this BS
    @Input() placeholder: string;
    @IBool() @Input() instant: CoercedBoolInput;

    @Output() onFocus = new EventEmitter<void>();
    @Output() onFocusOut = new EventEmitter<void>();

    public numberFilters: number = 0;
    public filtersSelected: string = '';
    public localFilter: SearchFilter = { query: '' };

    CONFIG: IConfig;
    Direction: Direction;
    LANG: LanguageI18NStaticTypes;

    private debounceShortTime: number;
    private debounceTime: number;
    private params: Record<string, string> = {};
    private searchUpdated = new Subject<string>();
    private modelUpdated = new Subject<void>();

    showAdvancedOptions: boolean;
    buttonArrowTypeUp: ButtonArrowType = ButtonArrowType.up;
    buttonArrowTypeDown: ButtonArrowType = ButtonArrowType.down;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private _route: ActivatedRoute,
        // private location: Location,
        private uri: NxUriService,
        private searchService: NxSearchService,
        private scrollMechanicsService: NxScrollMechanicsService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    ngOnInit(): void {
        if (this.instant) {
            this.debounceShortTime = 0;
            this.debounceTime = 0;
        } else {
            this.debounceShortTime = this.CONFIG.search.debounceShortTime;
            this.debounceTime = this.CONFIG.search.debounceTime;
        }
        this.showAdvancedOptions = this.layout !== 'full';
        // hide advanced search in "full" layout

        // Example URI
        // /ipvd?search=Axis&tags=isAptzSupported&resolution=SVGA&vendors=Axis,30X,Sony
        this._route.queryParams.subscribe(params => {
            this.params = params;
            this.updateFilter();
        });

        this.searchUpdated
            .pipe(untilDestroyed(this), debounceTime(this.debounceTime))
            .subscribe((data: string) => {
                this.localFilter.query = data;
                this.modelChanged();
            });

        this.modelUpdated
            .pipe(untilDestroyed(this), debounceTime(this.debounceShortTime))
            .subscribe(() => {
                this.modelChanged();
            });
    }

    ngOnDestroy(): void { }

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    private onTouchedCallback = (): void => { };
    private onChangeCallback = (_: SearchFilter): void => { };

    // Set touched on blur
    onBlur(): void {
        this.onTouchedCallback();
    }

    onSearchType(value: string): void {
        this.searchUpdated.next(value);
    }

    onModelChange(): void {
        this.modelUpdated.next();
    }

    updateFilter(): void {
        this.localFilter.query = this.localFilter.search || '';

        if (this.params.search?.length) {
            this.localFilter.query = this.params.search;

            this.searchService.getMatchPatterns(this.localFilter);
        }

        if (this.localFilter.tags?.length) {
            this.localFilter.tags.forEach(tag => { tag.value = false; });
            if (this.params.tags) {
                this.params.tags
                    .split(',')
                    .forEach(tagName => {
                        this.localFilter.tags.forEach(tag => {
                            if (tag.id === tagName) {
                                tag.value = true;
                            }
                        });
                    });
            }
        }

        this.localFilter.selects?.forEach(select => {
            if (this.params[select.id]) {
                select.selected = select.items.find(item =>
                    item.value === this.params[select.id]
                );
            } else {
                if (!select.selected) {
                    select.selected = { value: '0', name: 'All' };
                }
            }
        });

        this.localFilter.multiselects?.forEach(select => {
            if (this.params[select.id]) {
                select.selected = this.params[select.id].split(',');
            } else {
                select.selected = [];
            }
        });

        this.generateFiltersSelectedLabel();
    }

    writeValue(value: SearchFilter): void {
        // Avoid localFilter update if filter in not initialized (page refresh)
        if (
            value && (
                value.tags?.length ||
                value.selects?.length ||
                value.multiselects?.length ||
                value.tags?.length !== this.localFilter.tags?.length
            )
        ) {
            if (isEqual(this.localFilter, value)) {
                return;
            }
            this.localFilter = cloneDeep(value);

            // Update model with query params
            this.params = this._route.snapshot.queryParams;
            this.updateFilter();
        }
    }

    // From ControlValueAccessor interface
    registerOnChange(fn: (value: SearchFilter) => void): void {
        this.onChangeCallback = fn;
    }

    // From ControlValueAccessor interface
    registerOnTouched(fn: () => void): void {
        this.onTouchedCallback = fn;
    }

    toggleAdvOptions(): void {
        this.showAdvancedOptions = !this.showAdvancedOptions;
        this.scrollMechanicsService.offsetSubject.next(this.showAdvancedOptions);
    }

    generateFiltersSelectedLabel(): void {
        // No need to run this function while ngModel's writeValue initializes
        if (Object.keys(this.localFilter).length === 0) {
            return;
        }

        this.placeholder = this.placeholder || this.LANG.search.Search(); // optional param
        this.numberFilters = 0;
        this.filtersSelected = '';

        let flag = 0;
        let tagsSelected = '';
        let selectsSelected = '';
        let multiSelectsSelected = '';

        this.localFilter.tags?.forEach(filter => {
            if (filter.value) {
                this.numberFilters += 1;
                if (this.numberFilters > 1) {
                    selectsSelected = this.LANG.search.appliedFilters({
                        count: this.numberFilters
                    });
                } else {
                    tagsSelected = filter.label;
                }
                flag += 1;
            }
        });

        this.localFilter.selects?.forEach(select => {
            if (select.selected && select.selected.value !== '0') { // not default value
                this.numberFilters += 1;
                if (this.numberFilters > 1) {
                    selectsSelected = this.LANG.search.appliedFilters({
                        count: this.numberFilters
                    });
                } else {
                    selectsSelected = `${select.label}&nbsp;&ndash;&nbsp;${select.selected.name}`;
                }
                flag += 1;
            }
        });

        this.localFilter.multiselects?.forEach(select => {
            this.numberFilters += select.selected.length;

            if (select.selected.length > 0) {
                flag += 1;
            }

            let label: string;
            if (select.selected.length === 1) {
                label = select.label;

                if (select.singular) {
                    label = select.singular;
                }

                label += ' &ndash; ';

                if (select.searchLabelSingular !== undefined) {
                    label = select.searchLabelSingular;
                }

                const selectedLabel = select.items
                    .find(item => item.id === select.selected[0])
                    .label;
                multiSelectsSelected = `${label}${selectedLabel}`;
            } else if (select.selected.length > 1) {
                label = select.searchLabel ?? select.label.toLowerCase();
                multiSelectsSelected = `${select.selected.length} ${label}`;
            }
        });
        if (flag === 1) {
            // Only one category of filter selected
            // i.e. 1 tag, 1 select, or 1 multiselect
            this.filtersSelected = tagsSelected ||
                selectsSelected ||
                multiSelectsSelected;
        } else {
            this.filtersSelected = this.LANG.search.appliedFilters({
                count: this.numberFilters
            });
        }
    }

    clearFilters(): void {
        this.localFilter.tags?.forEach(filter => { filter.value = false; });

        this.localFilter.selects?.forEach(filter => {
            filter.selected = filter.items[0];
        });

        this.localFilter.multiselects?.forEach(filter => {
            filter.selected = [];
        });
    }

    resetFilters(): void {
        this.clearFilters();
        this.numberFilters = 0;
        this.filtersSelected = '';

        this.modelChanged();
    }

    resetQuery(): void {
        this.localFilter.query = '';
        this.modelChanged();
    }

    setOnFocus(): void {
        this.onFocus.emit();
    }

    setOnFocusOut(): void {
        this.onFocusOut.emit();
    }

    setRouteParams(): Promise<void | boolean | null> {
        const hasExistingParams = Object.values(this.params).some(Boolean);
        const queryParams: Record<string, string> = {};

        queryParams.tags = undefined;
        if (this.localFilter.tags?.length) {
            const selectedTags = this.localFilter.tags.filter(tag => tag.value);
            if (selectedTags.length) {
                queryParams.tags = selectedTags.map(elm => elm.id).join(',');
            }
        }

        queryParams.search = undefined;
        if (this.localFilter.query !== '') {
            queryParams.search = this.localFilter.query;
        }

        this.localFilter.selects?.forEach(select => {
            queryParams[select.id] = undefined;
            if (select.selected && select.selected.value !== '0') {
                queryParams[select.id] = select.selected.value;
            }
        });

        this.localFilter.multiselects?.forEach(select => {
            queryParams[select.id] = undefined;
            if (select.selected?.length) {
                queryParams[select.id] = select.selected.join(',');
            }
        });
        this.uri.pageOffset = this.window.pageYOffset;

        if (!isEqual(queryParams, this.params)) {
            // make sure we reset page on new model
            queryParams.page = undefined;
            const hasUpdatedParams = Object.values(queryParams).some(Boolean);
            const replaceUrl = hasExistingParams && hasUpdatedParams;

            return this.uri.updateURI(
                this.uri.getURL(),
                queryParams,
                replaceUrl
            );
        } else {
            return Promise.resolve(null);
        }
    }

    modelChanged(): void {
        this.setRouteParams()
            .then(response => {
                if (response === null) {
                    return;
                }
                this.generateFiltersSelectedLabel();
                this.onChangeCallback(this.localFilter);
            });
    }

    get canShowTags(): boolean {
        return !!this.localFilter.tags?.length;
    }

    get canShowSelectors(): boolean {
        return !!(
            this.localFilter.selects?.length ||
            this.localFilter.multiselects?.length
        );
    }

    navArrow(direction: ButtonArrowType): void {
        this.searchService.navDirection = direction;
    }

    navSelect(): void {
        this.searchService.navSelected();
    }
}
