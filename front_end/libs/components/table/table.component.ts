import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
    AfterContentInit,
    Component,
    ContentChild,
    ContentChildren,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    QueryList,
    Renderer2,
    TemplateRef,
    ViewChild,
    booleanAttribute,
} from '@angular/core';
import { Params } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { clamp, isEqual } from 'lodash-es';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxPaginatorComponent } from '@components/paginator/paginator.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSectionPlaceholderComponent } from '@components/placeholders/section/section-placeholder.component';
import { SortParams } from '@components/table/table.types';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import { Size } from '@directives/resize/nx-resize.directive.types';
import staticLang from '@language/language_i18n_static.json';
import { NxUriService } from '@services/uri.service';
import { paramSortFunc } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

/* USAGE
 <nx-table
    set-pagination                              // set pagination
    set-sorting                                 // set sorting
    set-rows                                    // allow row per page adjustment (dropdown)
    set-rows-auto                               // set row per page auto adjustment
    set-rearrange                               // allow columns to be re-arranged
    [set-arrange]="id name login ..."           // external control of column arranging
    [rows-per-page]="[{name: '5', value: 5}]"
    [set-sorting-default]="'vendor'"            // set default sorting on column ASC
    [set-row-expand]="subLevels"                // control if rows can be expanded
    (onRowExpand)="expandRow($event)"
    [data]='records'>
</nx-table>

 Optional header and rows can be supplied through ng-template
 .. see sandbox/table
*/

type Prop = [];

const TABLE_MARGINS = 16;
const ROW_HEIGHT = 40; // if needed a change - do it in theme_variable_common too

@UntilDestroy()
@Component({
    selector: 'nx-table',
    templateUrl: 'table.component.html',
    styleUrls: ['table.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        DragDropModule,
        NxCheckboxComponent,
        NxGenericDropdownModule,
        NxPaginatorComponent,
        NxPreLoaderComponent,
        NxSectionPlaceholderComponent,
        NxResizeObserver,
    ],
})
export class NxBaseTableComponent<T> implements AfterContentInit, OnChanges {
    @Input() headers: T[] = [];
    @Input() data: T[] = [];

    @Input({ alias: 'set-pagination', transform: booleanAttribute }) setPagination: boolean;
    @Input({ alias: 'set-rows', transform: booleanAttribute }) setRows: boolean;
    @Input({ alias: 'set-rows-auto', transform: booleanAttribute }) setAutoRows: boolean;
    @Input({ alias: 'set-sorting', transform: booleanAttribute }) setSorting: boolean;
    @Input({ alias: 'set-rearrange', transform: booleanAttribute }) setRearrange: boolean;
    @Input('set-arrange') setArrange: string[] = [];
    @Input('set-row-expand') setRowExpand: boolean = false;
    @Input('rows-per-page') rowsPerPage: Array<number> = [10, 25, 50, 100];
    @Input('set-sorting-default') defaultSort: Record<string, string>;
    @Input('set-additional-classes') additionalClasses: string[];
    @Input('set-selected-item-id') selectedItemId: string;
    @Input('set-multiple-selected-item-ids') selectItemIds: Map<string, boolean> = new Map();
    @Input('set-id-prop-name') idPropName: string = 'id';

    @Output() onRowExpand = new EventEmitter<string>();
    @Output() onRowClick = new EventEmitter<T>();

    @ContentChild('header') header: TemplateRef<never>;
    @ContentChild('rows') rows: TemplateRef<never>;

    @ContentChildren('sortItem', { descendants: true }) sortableItems: QueryList<
        ElementRef<HTMLDivElement>
    >;

    @ViewChild('tableBodyContainer', { static: false })
    private tableBodyContainer: ElementRef<HTMLDivElement>;

    LANG = staticLang;

    expandRowId: string;

    params: Params;
    currentPage: number = 1;
    numPages: number;
    nDisplayed: string;
    pagedItems: T[];
    perPageOptions: DropdownItem<number>[] = [];
    perPageSelectedOption: DropdownItem<number>;

    public selectedHeader: string;
    public sortOrderASC: boolean = true;

    template: string = '';
    _headers: Prop = [];

    tableClasses: string;

    constructor(
        private renderer: Renderer2,
        private uri: NxUriService,
    ) {
        this.uri
            .getParams()
            .pipe(untilDestroyed(this))
            .subscribe(params => {
                this.params = params;
                // TODO: add sorting
            });
    }

    private createTemplate(): void {
        this.template = this.setArrange?.length
            ? `"${this.setArrange.join(' ')}"`
            : `"${this.headers.join(' ')}"`;
    }

    drop(event: CdkDragDrop<Prop[]>): void {
        moveItemInArray(this.headers, event.previousIndex, event.currentIndex);
        this.createTemplate();
    }

    removeKey(index: number): void {
        this.headers.splice(index, 1);
        this.createTemplate();
    }

    restore(): void {
        this.headers = [...this._headers];
        this.createTemplate();
    }

    initPageRows(): void {
        if (this.tableBodyContainer) {
            if (this.setAutoRows && this.data?.length) {
                const autoRows = clamp(
                    Math.floor(
                        (this.tableBodyContainer?.nativeElement.clientHeight - TABLE_MARGINS) /
                            ROW_HEIGHT,
                    ),
                    1,
                    this.data?.length || 1,
                );
                this.perPageSelectedOption = { name: 'auto', value: autoRows };
            } else {
                this.rowsPerPage.forEach(item => {
                    this.perPageOptions.push({ name: `${item}`, value: item });
                });
                this.perPageOptions.push({ name: this.LANG.search.All, value: this.data?.length });
                this.perPageSelectedOption = this.perPageOptions[1]; // 10 items per page - we need to make it dynamic
            }

            this.numPages = Math.ceil(this.data?.length / this.perPageSelectedOption.value);

            this.createTemplate();
            this.currentPage = 1;

            this.sortElements(true);
        }
    }

    ngOnChanges({ additionalClasses, data }: NgChanges<NxBaseTableComponent<T>>): void {
        if (
            data?.currentValue?.length &&
            (data.firstChange || !isEqual(data.currentValue, data?.previousValue))
        ) {
            this._headers = <Prop>Object.keys(this.data[0]);
            this.headers = [...this._headers];

            this.initPageRows();
        }

        if (additionalClasses?.currentValue) {
            this.tableClasses = this.additionalClasses.join(' ');
        }
    }

    ngAfterContentInit(): void {
        if (this.setSorting) {
            this.sortableItems.changes
                .pipe(untilDestroyed(this))
                .subscribe((items: QueryList<HTMLDivElement>) => {
                    if (items.length) {
                        this.addSorting(items);
                    } else {
                        console.info(
                            '¯\\_(ツ)_/¯ => Sorting is enabled for table but no columns set for sorting',
                        );
                    }
                });
        }
    }

    private sortElements(keepURI: boolean = false): void {
        if (this.params.sortBy) {
            const sortBy = this.params.sortBy.split(',');
            this.sortOrderASC = sortBy[1] === 'ASC';

            try {
                // const sortElement = this.renderer.selectRootElement(`#${sortBy[0]} div`);
                const sortElement = document.querySelector(`#${sortBy[0]}`);
                const sortSvg = sortElement.querySelector('div');
                this.selectedHeader = sortBy[0];
                this.sortColumn(sortSvg, sortElement.attributes['data-sort'].value, false);
            } catch (e) {}
            // adding class removes SVG ... need to investigate -- TT
            // const elm = this.renderer.selectRootElement(`#${sortBy[0]} div`);
            // this.renderer.addClass(elm, this.sortOrderASC ? 'sort-svg-asc' : 'sort-svg-desc');
            // this.toggleSort(sortBy[0], this.defaultSort.type, keepURI);
        } else {
            if (this.defaultSort) {
                this.toggleSort(this.defaultSort.name, this.defaultSort.type, true);
            }
        }

        const pageNum = this.params?.page ? Number(this.params.page) : 1;

        this.setPage(Math.min(pageNum, this.numPages));
    }

    onResize(event: Size): void {
        if (event.height) {
            this.initPageRows();
        }
    }

    private toggleSort(param: string, sortType: string, keepURI?: boolean): void {
        let byParam: (a: T, b: T) => number;

        let dataParam = param;
        for (const key in this.data[0]) {
            if (key.toLowerCase() === dataParam) {
                dataParam = key;
                break;
            }
        }

        switch (sortType) {
            case 'string':
                const collator = new Intl.Collator(navigator.language);
                // Using collator object here for speed
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare#performance
                byParam = (a, b) => {
                    const result = collator.compare(<string>a[dataParam], <string>b[dataParam]);
                    return this.sortOrderASC ? result : -result;
                };
                break;
            case 'number':
                byParam = paramSortFunc(elm => elm[param], this.sortOrderASC);
                break;
            case 'boolean':
                byParam = paramSortFunc(elm => {
                    if (elm[param] === null || elm[param] === undefined) {
                        return 0;
                    } else if (!elm[param]) {
                        return 1;
                    } else {
                        return 2;
                    }
                }, this.sortOrderASC);
                break;
            // IPVD special cases
            case 'resolution': // 1980x1200
                byParam = paramSortFunc((elm: T): number => {
                    const xy = elm[param].split('x');
                    return parseInt(xy[0]) * parseInt(xy[1]);
                }, this.sortOrderASC);
                break;
            case 'audio': // isAudioSupported or isTwAudioSupported
                byParam = paramSortFunc((elm: T): number => {
                    // @ts-expect-error type
                    const audio = elm.isAudioSupported;
                    // @ts-expect-error type
                    const twAudio = elm.isTwAudioSupported;
                    if (twAudio) {
                        return 2;
                    } else if (audio) {
                        return 1;
                    } else {
                        return 0;
                    }
                }, this.sortOrderASC);
                break;
            case 'ptz': // isPtzSupported or isAptzSupported
                byParam = paramSortFunc((elm: T): number => {
                    // @ts-expect-error type
                    const ptz = elm.isPtzSupported;
                    // @ts-expect-error type
                    const aPtz = elm.isAptzSupported;
                    if (aPtz) {
                        return 2;
                    } else if (ptz) {
                        return 1;
                    } else {
                        return 0;
                    }
                }, this.sortOrderASC);
                break;
        }

        this.data.sort(byParam);

        if (!keepURI) {
            this.setPage(1);
        }

        this.selectedHeader = param;
    }

    private clearCss(item: HTMLDivElement | EventTarget): void {
        this.renderer.removeClass(item, 'sort-svg-asc');
        this.renderer.removeClass(item, 'sort-svg-desc');
    }

    private sortColumn(
        item: MouseEvent | HTMLDivElement,
        sortType: string,
        changeSortOrder: boolean = true,
    ): void {
        const isEventTargetElement = (item: MouseEvent | HTMLDivElement): item is MouseEvent =>
            item instanceof MouseEvent;
        const target = isEventTargetElement(item) ? (item.target as HTMLDivElement) : item;
        const targetId = target.id;

        if (changeSortOrder && (!this.selectedHeader || targetId === this.selectedHeader)) {
            this.sortOrderASC = !this.sortOrderASC;
            this.clearCss(target);
        } else {
            this.sortableItems.forEach((item: ElementRef) => {
                if (item.nativeElement.children[this.selectedHeader]) {
                    this.clearCss(item.nativeElement.children[this.selectedHeader]);
                }
            });
        }

        this.renderer.addClass(target, this.sortOrderASC ? 'sort-svg-asc' : 'sort-svg-desc');
        this.toggleSort(targetId, sortType, false);

        const queryParams: SortParams = {
            page: undefined,
            sortBy: `${targetId},${this.sortOrderASC ? 'ASC' : 'DESC'}`,
        };

        this.uri.updateURI('', queryParams).catch(error => {
            console.error(error);
        });
    }

    private createSortElement(id: string, sortType: string): HTMLDivElement | undefined {
        if (!sortType) {
            console.info(
                '¯\\_(ツ)_/¯ => Sorting enabled for column but no datatype is set for sorting',
            );
            return;
        }

        const sort: HTMLDivElement = this.renderer.createElement('div');
        this.renderer.listen(sort, 'click', $event => this.sortColumn($event, sortType));
        this.renderer.addClass(sort, 'sort-svg');
        this.renderer.setAttribute(sort, 'id', id);

        const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // iconSvg.setAttribute('id', id);
        iconSvg.setAttribute('fill', 'none');
        iconSvg.setAttribute('viewBox', '0 0 16 16');
        iconSvg.setAttribute('width', '16');
        iconSvg.setAttribute('height', '16');
        iconSvg.setAttribute('stroke', 'none');
        // iconSvg.classList.add('path');

        iconPath.setAttribute('d', 'M2 3H14V5H2V3ZM2 7H10V9H2V7ZM6 11H2V13H6V11Z');
        iconPath.setAttribute('fill-rule', 'round');
        iconPath.setAttribute('clip-rule', 'round');

        iconSvg.appendChild(iconPath);
        this.renderer.appendChild(sort, iconSvg);

        return sort;
    }

    private getItemId(item: ElementRef): string {
        return (
            item.nativeElement.id ||
            item.nativeElement.innerText.toLowerCase().replace(/[^a-z]/g, '')
        );
    }

    private addSorting(items: QueryList<HTMLDivElement>): void {
        // @ts-expect-error type error
        items.forEach((item: ElementRef) => {
            if (item.nativeElement.dataset.sort) {
                const id = this.getItemId(item);

                this.renderer.listen(item.nativeElement, 'mouseover', $event => {
                    if ($event.target.children[id]) {
                        this.renderer.addClass($event.target.children[id], 'sort-svg-hover');
                    }
                });
                this.renderer.listen(item.nativeElement, 'mouseout', $event => {
                    if ($event.target.children[id]) {
                        this.renderer.removeClass($event.target.children[id], 'sort-svg-hover');
                    }
                });
                this.renderer.listen(
                    item.nativeElement,
                    'click',
                    $event =>
                        $event.target.children[id] &&
                        this.sortColumn(
                            $event.target.children[id],
                            item.nativeElement.dataset.sort,
                        ),
                );

                const sort = this.createSortElement(id, item.nativeElement.dataset.sort);
                this.renderer.appendChild(item.nativeElement, sort);
            }
        });
    }

    setPage(page: number): void {
        this.currentPage = page;
        const startIndex = (page - 1) * this.perPageSelectedOption.value;
        const endIndex = startIndex + this.perPageSelectedOption.value;
        this.pagedItems = this.data?.slice(startIndex, endIndex);

        if (this.currentPage === 1) {
            this.nDisplayed = `1-${Math.min(this.perPageSelectedOption.value, this.data?.length)}`;
        } else {
            this.nDisplayed = `${
                (this.currentPage - 1) * this.perPageSelectedOption.value + 1
            }-${Math.min(
                (this.currentPage - 1) * this.perPageSelectedOption.value + this.pagedItems.length,
                this.data?.length,
            )}`;
        }
    }

    setRowsPerPage(item: DropdownItem<number>): void {
        this.perPageSelectedOption = item;
        this.numPages = Math.ceil(this.data.length / this.perPageSelectedOption.value);
        this.setPage(1);
    }

    // trackItem(
    //     _index: number,
    //     item: Record<string, string | boolean | Record<string, string>[]>,
    // ): string | boolean | Record<string, string>[] {
    //     return item ? item.id : undefined;
    // }

    rowExpand(selected: T): void {
        // if (this.expandRowId === selected.id || !this.setRowExpand) {
        //     this.expandRowId = '';
        // } else {
        //     this.expandRowId = selected.id;
        // }
        // this.setRowExpand && this.onRowExpand.emit(this.expandRowId);
    }

    rowClick(selected: T): void {
        this.onRowClick.emit({ ...selected });
    }
}
