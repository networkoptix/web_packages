import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import {
    AfterContentInit,
    Component,
    ContentChild,
    ContentChildren,
    ElementRef,
    EventEmitter,
    Inject,
    Input,
    LOCALE_ID,
    OnChanges,
    OnInit,
    Output,
    QueryList,
    Renderer2,
    TemplateRef,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import staticLang from '@app/language/language_i18n_static.json';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
// import { TData } from '@components/table/table.types';
import { CoercedBoolInput, IBool } from '@decorators/ibool';
import { NgChanges } from '@utils/ng-changes';

/* USAGE
 <nx-table
    set-pagination                              // set pagination
    set-sorting                                 // set sorting
    set-rows                                    // allow row per page adjustment (dropdown)
    set-rearrange                               // allow columns to be re-arranged
    [set-arrange]="id name login ..."           // external control of column arranging
    [rows-per-page]="[{name: '5', value: 5}]"
    [set-row-expand]="subLevels"                // control if rows can be expanded
    (onRowExpand)="expandRow($event)"
    [data]='records'>
</nx-table>

 Optional header and rows can be supplied through ng-template
 .. see sandbox/table
*/

type Prop = [];

@UntilDestroy()
@Component({
    selector: 'nx-table',
    templateUrl: 'table.component.html',
    styleUrls: ['table.component.scss'],
})
export class NxBaseTableComponent<T> implements OnInit, AfterContentInit, OnChanges {
    @Input() data: T[];

    @IBool() @Input('set-pagination') setPagination: CoercedBoolInput;
    @IBool() @Input('set-rows') setRows: CoercedBoolInput;
    @IBool() @Input('set-sorting') setSorting: CoercedBoolInput;
    @IBool() @Input('set-rearrange') setRearrange: CoercedBoolInput;
    @Input('set-arrange') setArrange: string[] = [];
    @Input('set-row-expand') setRowExpand: boolean = false;
    @Input('rows-per-page') rowsPerPage: Array<number> = [5, 10, 20, 50];

    @Output() onRowExpand = new EventEmitter<string>();

    @ContentChild('header') header: TemplateRef<never>;
    @ContentChild('rows') rows: TemplateRef<never>;

    @ContentChildren('sortItem', { descendants: true }) sortableItems: QueryList<HTMLDivElement>;

    LANG = staticLang;

    expandRowId: string;

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
    headers: Prop = [];

    constructor(private renderer: Renderer2, @Inject(LOCALE_ID) private locale: string) {}

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

    ngOnInit(): void {
        this.rowsPerPage.forEach(item => {
            this.perPageOptions.push({ name: `${item}`, value: item });
        });
    }

    ngOnChanges(changes: NgChanges<NxBaseTableComponent<T>>): void {
        if (changes.data?.currentValue.length) {
            this._headers = <Prop>Object.keys(this.data[0]);
            this.headers = [...this._headers];
            this.createTemplate();

            this.perPageOptions.push({ name: this.LANG.search.All, value: this.data.length });
            this.perPageSelectedOption = this.perPageOptions[0];

            this.numPages = Math.ceil(this.data.length / this.perPageSelectedOption.value);
            this.setPage(1);
        }
    }

    ngAfterContentInit(): void {
        this.setSorting &&
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

    private toggleSort(param: string, sortType: DOMStringMap, keepURI?: boolean): void {
        let byParam: (a: T, b: T) => number;

        let dataParam = param;
        for (const key in this.data[0]) {
            if (key.toLowerCase() === dataParam) {
                dataParam = key;
                break;
            }
        }

        if (sortType.sortString !== undefined) {
            const collator = new Intl.Collator(this.locale);
            // Using collator object here for speed
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare#performance
            byParam = (a, b) => {
                const result = collator.compare(<string>a[dataParam], <string>b[dataParam]);
                return this.sortOrderASC ? result : -result;
            };
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

    private sortColumn(item: EventTarget | HTMLDivElement, sortType: DOMStringMap): void {
        // @ts-expect-error type error
        const targetId = item.target?.id || item.id;
        let target = item;
        if ('target' in item) {
            // @ts-expect-error compile type error
            target = item.target as EventTarget;
        }

        if (!this.selectedHeader || targetId === this.selectedHeader) {
            this.sortOrderASC = !this.sortOrderASC;
            this.clearCss(target);
        } else {
            this.sortOrderASC = true;
            // @ts-expect-error type error
            this.sortableItems.forEach((item: ElementRef) => {
                if (item.nativeElement.children[this.selectedHeader]) {
                    this.clearCss(item.nativeElement.children[this.selectedHeader]);
                }
            });
        }

        this.renderer.addClass(target, this.sortOrderASC ? 'sort-svg-asc' : 'sort-svg-desc');
        this.toggleSort(targetId, sortType, false);
    }

    private createSortElement(id: string, sortType: DOMStringMap): HTMLDivElement {
        if (!Object.keys(sortType).length) {
            console.info(
                '¯\\_(ツ)_/¯ => Sorting enabled for column but no datatype is set for sorting',
            );
        }

        const sort: HTMLDivElement = this.renderer.createElement('div');
        this.renderer.listen(sort, 'click', $event => this.sortColumn($event, sortType));
        this.renderer.addClass(sort, 'sort-svg');
        this.renderer.setAttribute(sort, 'id', id);

        sort.innerHTML = `<?xml version="1.0" encoding="utf-8"?>
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="7" width="12" height="2" style="fill: lightgray; stroke: none;"></rect>
                  <rect x="6" y="11" width="8" height="2" style="fill: lightgray; stroke: none;"></rect>
                  <rect x="6" y="15" width="4" height="2" style="fill: lightgray; stroke: none;"></rect>
                </svg>`;
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
            const id = this.getItemId(item);

            this.renderer.listen(item.nativeElement, 'mouseover', $event => {
                $event.target.children[id] &&
                    this.renderer.addClass($event.target.children[id], 'sort-svg-hover');
            });
            this.renderer.listen(item.nativeElement, 'mouseout', $event => {
                $event.target.children[id] &&
                    this.renderer.removeClass($event.target.children[id], 'sort-svg-hover');
            });
            this.renderer.listen(
                item.nativeElement,
                'click',
                $event =>
                    $event.target.children[id] &&
                    this.sortColumn($event.target.children[id], item.nativeElement.dataset),
            );

            const sort = this.createSortElement(id, item.nativeElement.dataset);
            this.renderer.appendChild(item.nativeElement, sort);
        });
    }

    setPage(page: number): void {
        this.currentPage = page;
        const startIndex = (page - 1) * this.perPageSelectedOption.value;
        const endIndex = startIndex + this.perPageSelectedOption.value;
        this.pagedItems = this.data.slice(startIndex, endIndex);

        if (this.currentPage === 1) {
            this.nDisplayed = `1-${Math.min(this.perPageSelectedOption.value, this.data.length)}`;
        } else {
            this.nDisplayed = `${
                (this.currentPage - 1) * this.perPageSelectedOption.value + 1
            }-${Math.min(
                (this.currentPage - 1) * this.perPageSelectedOption.value + this.pagedItems.length,
                this.data.length,
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

    onRowClick(event: MouseEvent): void {
        if (this.expandRowId === (event.target as HTMLTableElement).id || !this.setRowExpand) {
            this.expandRowId = '';
        } else {
            this.expandRowId = (event.target as HTMLTableElement).id;
        }
        this.setRowExpand && this.onRowExpand.emit(this.expandRowId);
    }
}
