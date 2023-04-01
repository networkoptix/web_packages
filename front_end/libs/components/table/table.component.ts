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
    OnInit,
    Output,
    QueryList,
    Renderer2,
    TemplateRef,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { CoercedBoolInput, IBool } from '@decorators/ibool';

/* USAGE
 <nx-table
    set-pagination                  // set pagination
    set-sorting                     // set sorting
    set-rows                        // allow row per page adjustment (dropdown)
    [set-row-expand]="subLevels"    // control if rows can be expanded
    (onRowExpand)="expandRow($event)"
    [data]='records'>
</nx-table>

 Optional header and rows can be supplied through ng-template
 .. see sandbox/table
*/

const ROW_PER_PAGE = 10;

@UntilDestroy()
@Component({
    selector: 'nx-table',
    templateUrl: 'table.component.html',
    styleUrls: ['table.component.scss'],
})
export class NxTableComponent implements OnInit, AfterContentInit {
    @Input() data: Record<string, string | boolean | Record<string, string>[]>[];
    @IBool() @Input('set-pagination') setPagination: CoercedBoolInput;
    @IBool() @Input('set-rows') setRows: CoercedBoolInput;
    @IBool() @Input('set-sorting') setSorting: CoercedBoolInput;
    @Input('set-row-expand') setRowExpand: boolean = false;

    @Output() onRowExpand = new EventEmitter<string>();

    @ContentChild('header') header: TemplateRef<never>;
    @ContentChild('rows') rows: TemplateRef<never>;

    @ContentChildren('sortItem', { descendants: true }) headerItems: QueryList<HTMLDivElement>;

    expandRowId: string;

    currentPage: number = 1;
    numPages: number;
    nDisplayed: string;
    pagedItems: Record<string, string | boolean | Record<string, string>[]>[];
    perPageOptions: DropdownItem<number>[] = [];
    perPageSelectedOption = { name: `${ROW_PER_PAGE}`, value: ROW_PER_PAGE };

    public selectedHeader: string;
    public sortOrderASC: boolean = true;

    constructor(private renderer: Renderer2, @Inject(LOCALE_ID) private locale: string) {}

    ngOnInit(): void {
        this.perPageOptions.push({ name: '5', value: 5 });
        this.perPageOptions.push({ name: 'All', value: this.data.length });
        this.numPages = Math.ceil(this.data.length / this.perPageSelectedOption.value);
        this.setPage(1);
    }

    ngAfterContentInit(): void {
        this.setSorting &&
            this.headerItems.changes
                .pipe(untilDestroyed(this))
                .subscribe((items: QueryList<HTMLDivElement>) => {
                    if (items.length) {
                        this.addSorting(items);
                    } else {
                        console.info(
                            '¯\\_(ツ)_/¯ => Sorting enabled for table but no columns set for sorting',
                        );
                    }
                });
    }

    private toggleSort(param: string, sortType: DOMStringMap, keepURI?: boolean): void {
        let byParam: (
            a: Record<string, string | boolean | Record<string, string>[]>,
            b: Record<string, string | boolean | Record<string, string>[]>,
        ) => number;

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
            // @ts-expect-error type error
            target = item.target as EventTarget;
        }

        if (!this.selectedHeader || targetId === this.selectedHeader) {
            this.sortOrderASC = !this.sortOrderASC;
            this.clearCss(target);
        } else {
            this.sortOrderASC = true;
            // @ts-expect-error type error
            this.headerItems.forEach((item: ElementRef) => {
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

    private addSorting(items: QueryList<HTMLDivElement>): void {
        // @ts-expect-error type error
        items.forEach((item: ElementRef) => {
            const id =
                item.nativeElement.id ||
                item.nativeElement.innerText.toLowerCase().replace(/[^a-z]/g, '');

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
            this.nDisplayed = `1-${this.perPageSelectedOption.value}`;
        } else {
            this.nDisplayed = `${(this.currentPage - 1) * this.perPageSelectedOption.value + 1}-${
                (this.currentPage - 1) * this.perPageSelectedOption.value + this.pagedItems.length
            }`;
        }
    }

    setRowsPerPage(item: DropdownItem<number>): void {
        this.perPageSelectedOption = item;
        this.numPages = Math.ceil(this.data.length / this.perPageSelectedOption.value);
        this.setPage(1);
    }

    trackItem(
        _index: number,
        item: Record<string, string | boolean | Record<string, string>[]>,
    ): string | boolean | Record<string, string>[] {
        return item ? item.id : undefined;
    }

    onRowClick(event: MouseEvent): void {
        if (this.expandRowId === (event.target as HTMLTableElement).id || !this.setRowExpand) {
            this.expandRowId = '';
        } else {
            this.expandRowId = (event.target as HTMLTableElement).id;
        }
        this.setRowExpand && this.onRowExpand.emit(this.expandRowId);
    }
}
