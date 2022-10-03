import { ElementRef, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { NxRibbonService } from '@components/ribbon';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';

import { NxHealthService } from './health.service';

@Injectable({
    providedIn: 'root'
})
export class NxHealthLayoutService {
    private static ELEMENT_SEARCH_HEIGHT = 40; // px

    CONFIG: IConfig;
    previousActiveEntity = undefined;
    activeEntitySubject = new BehaviorSubject(undefined);
    fixedLayoutClassSubject = new BehaviorSubject('');
    dimensionsSubject = new BehaviorSubject([]);
    layoutReadySubject = new BehaviorSubject(false);
    metricsValuesCountSubject = new BehaviorSubject(0);
    mobileDetailModeSubject = new BehaviorSubject(false);
    pageSizeSubject = new BehaviorSubject(undefined);
    tableWidthSubject = new BehaviorSubject(0);

    // Common between alerts and metrics
    searchTableAreaSubject = new BehaviorSubject(undefined);
    searchElementSubject = new BehaviorSubject(undefined);

    // Alerts only
    tilesElementSubject = new BehaviorSubject(undefined);

    // Dynamic table elements
    tableElementSubject = new BehaviorSubject(undefined);
    tableHeaderElementSubject = new BehaviorSubject(undefined);
    tableTitleElementSubject = new BehaviorSubject(undefined);

    get activeEntity() {
        return this.activeEntitySubject.getValue();
    }

    set activeEntity(entity: any) {
        this.layoutReady = false;
        this.previousActiveEntity = this.activeEntity;
        this.activeEntitySubject.next(entity);
    }

    get searchTableArea() {
        return this.searchTableAreaSubject.getValue();
    }

    set searchTableArea(element: ElementRef) {
        this.searchTableAreaSubject.next(element);
    }

    get dimensions() {
        return this.dimensionsSubject.getValue();
    }

    set dimensions(dimensions: number[]) {
        this.dimensionsSubject.next(dimensions);
    }

    get fixedLayoutClass() {
        return this.fixedLayoutClassSubject.getValue();
    }

    set fixedLayoutClass(className: string) {
        this.fixedLayoutClassSubject.next(className);
    }

    get layoutReady() {
        return this.layoutReadySubject.getValue();
    }

    set layoutReady(value: boolean) {
        this.layoutReadySubject.next(value);
    }

    get metricsValuesCount() {
        return this.metricsValuesCountSubject.getValue();
    }

    set metricsValuesCount(count) {
        this.metricsValuesCountSubject.next(count);
    }

    get mobileDetailMode() {
        return this.mobileDetailModeSubject.getValue();
    }

    set mobileDetailMode(value: boolean) {
        this.mobileDetailModeSubject.next(value);
    }

    get pageSize() {
        return this.pageSizeSubject.getValue();
    }

    set pageSize(pageSize: number) {
        if (pageSize !== this.pageSize) {
            this.pageSizeSubject.next(pageSize);
        }
    }

    get searchElement() {
        return this.searchElementSubject.getValue();
    }

    set searchElement(element: ElementRef) {
        this.searchElementSubject.next(element);
    }

    get tableElement() {
        return this.tableElementSubject.getValue();
    }

    set tableElement(element: ElementRef) {
        this.tableElementSubject.next(element);
    }

    get tableHeaderElement() {
        return this.tableHeaderElementSubject.getValue();
    }

    set tableHeaderElement(element: ElementRef) {
        this.tableHeaderElementSubject.next(element);
    }

    get tableTitleElement() {
        return this.tableTitleElementSubject.getValue();
    }

    set tableTitleElement(element: ElementRef) {
        this.tableTitleElementSubject.next(element);
    }

    get tableWidth() {
        return this.tableWidthSubject.getValue();
    }

    set tableWidth(width: number) {
        this.tableWidthSubject.next(width);
    }

    get tilesElement() {
        return this.tilesElementSubject.getValue();
    }

    set tilesElement(element: ElementRef) {
        this.tilesElementSubject.next(element);
    }

    constructor(
        configService: NxConfigService,
        private ribbonService: NxRibbonService,
        private healthService: NxHealthService,
        private scrollMechanicsService: NxScrollMechanicsService
    ) {
        this.CONFIG = configService.getConfig();
        this.pageSize = this.CONFIG.layout.tableLarge.rows;

        this.dimensionsSubject.pipe(debounceTime(10)).subscribe(() => {
            if (this.tableHeaderElement) {
                this.setTableDimensions();
            }
        });

        this.tableWidthSubject.subscribe((width) => this.setSearchWidth(width));
        this.activeEntitySubject.subscribe((entity) => {
            this.setTableDimensions();
        });
    }

    resetActiveEntity() {
        this.activeEntity = undefined;
        this.mobileDetailMode = false;
    }

    setAlertLayout() {
        const searchElementHeight = this.searchElement
            ? this.searchElement.nativeElement.offsetHeight
            : 0;
        const elementTilesHeight = this.tilesElement
            ? this.tilesElement.nativeElement.offsetHeight
            : 0;
        if (!this.mobileDetailMode) {
            this.dimensions = [elementTilesHeight, searchElementHeight, 17];
            /* separator = 1px + padding */
        }
        const cannotSetSearch = this.previousActiveEntity === undefined;
        this.setLayout(cannotSetSearch);
    }

    setMetricsLayout() {
        if (this.metricsValuesCount === 1) {
            this.fixedLayoutClass = 'fixedLayout--no-panel';
        } else {
            if (!this.mobileDetailMode) {
                // In case metric  (w/ table) was already initialized and
                // switching between single and multiple entities, layout will report 0 height for search.
                // metric pages have search component always so to avoid unnecessary complications I'll hardcode it -- TT
                this.dimensions = [NxHealthLayoutService.ELEMENT_SEARCH_HEIGHT + 16]; // [elementSearchHeight + 16]
            }
            this.setLayout();
        }
    }

    setTableDimensions() {
        if (this.mobileDetailMode && this.activeEntity) {
            // In mobile view and when an entity is active we need to break up self invoking setTableDimensions
            this.healthService.tableReady = true;
            return;
        }

        const tableHeader = this.tableHeaderElement && this.tableHeaderElement.nativeElement;
        const table = this.tableElement && this.tableElement.nativeElement;

        // table not visible - no need to calculate
        if (table && table.offsetLeft < 0) {
            this.healthService.tableReady = true;
            return;
        }

        // "tableReady" was quite unreliable since we don't recreate the table - fixed.
        // ... have a feeling that making the table off screen causes table header and table title
        // to report 0 height initially and screw pageSize calc.
        //
        if (
            !table || (
                table.offsetLeft === 0 &&
                tableHeader?.innerText.length &&
                !tableHeader.offsetHeight
            )
        ) {
            // short circuit single entity - this was going until metric w/ page is loaded -- TT
            if (this.metricsValuesCount > 1) {
                this.healthService.tableReady = false;
                setTimeout(() => this.setTableDimensions());
            }
            return;
        }

        const windowSize = this.scrollMechanicsService.windowSizeSubject.getValue();

        const ELEMENTS_HEIGHT = this.dimensions.reduce((prev, curr) => prev + curr, 0);
        const THEAD_HEIGHT = this.tableHeaderElement ? tableHeader.offsetHeight : 0;
        const PADDING = 16;
        const PAGINATION_HEIGHT = 64;
        const RIBBON_HEIGHT = 34;
        const ROW_HEIGHT = 26;

        let availSpace = windowSize.height - 4 * PADDING - ELEMENTS_HEIGHT - THEAD_HEIGHT - 48 - PAGINATION_HEIGHT;

        const isRibbon = this.ribbonService.contextSubject.getValue();
        if (isRibbon.visibility) {
            availSpace -= RIBBON_HEIGHT;
        }

        if (this.tableTitleElement) {
            availSpace -= this.tableTitleElement.nativeElement.offsetHeight;
        }

        let pageSize = Math.ceil(availSpace / ROW_HEIGHT);
        if (pageSize < 5) {
            pageSize = 5;
        }
        this.pageSize = pageSize;
        if (this.tableElement && table.offsetWidth !== 0) {
            this.tableWidth = table.offsetWidth;
        }
        this.healthService.tableReady = true;
    }

    private setLayout(cannotSearchStyle?: boolean) {
        if (!this.tableElement || !this.healthService.tableReady) {
            return;
        }

        // measure table (not wrapper) width
        const table = this.tableElement.nativeElement.querySelectorAll('table')[0];
        this.tableWidth = table ? table.offsetWidth : 0;

        if (this.activeEntity && !this.mobileDetailMode) {
            const areaWidth = this.searchTableArea ? this.searchTableArea.nativeElement.offsetWidth : 0;
            const widthPanel = this.healthService.getPanelWidth();
            const isTableFit = (areaWidth > this.tableWidth + widthPanel + 16); // +gutter
            this.fixedLayoutClass = (isTableFit) ? '' : 'fixedLayout--with-panel';

            if (!cannotSearchStyle && this.searchElement) {
                this.searchElement.nativeElement.style.width = 'auto';
            }
        } else {
            this.fixedLayoutClass = 'fixedLayout--no-panel';
        }
        this.layoutReady = true;
    }

    private setSearchWidth(width) {
        if (this.searchElement) {
            this.searchElement.nativeElement.style.width = `${width}px`;
        }
    }
}
