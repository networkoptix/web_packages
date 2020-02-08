import { ElementRef, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NxScrollMechanicsService } from '../../services/scroll-mechanics.service';
import { NxHealthService } from './health.service';
import { NxConfigService } from '../../services/nx-config';

@Injectable({
    providedIn: 'root'
})
export class NxHealthLayoutService {
    CONFIG: any;
    dimensionsSubject = new BehaviorSubject([]);
    pageSizeSubject = new BehaviorSubject(undefined);
    tableWidthSubject = new BehaviorSubject(0);

    searchElementSubject = new BehaviorSubject(undefined);
    tableElementSubject = new BehaviorSubject(undefined);
    tableHeaderElementSubject = new BehaviorSubject(undefined);
    tableTitleElementSubject = new BehaviorSubject(undefined);

    private static ROW_HEIGHT = 26;

    get dimensions() {
        return this.dimensionsSubject.getValue();
    }

    set dimensions(dimensions: number[]) {
        this.dimensionsSubject.next(dimensions);
    }

    get pageSize() {
        return this.pageSizeSubject.getValue();
    }

    set pageSize(pageSize: number) {
        this.pageSizeSubject.next(pageSize);
    }

    get searchElement() {
        return this.searchElementSubject.getValue();
    }

    set searchElement(element) {
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

    constructor(private config: NxConfigService,
                private healthService: NxHealthService,
                private scrollMechanicsService: NxScrollMechanicsService) {
        this.CONFIG = this.config.getConfig();
        this.tableWidthSubject.subscribe((width) => this.setSearchWidth(width));
        this.pageSize = this.CONFIG.layout.tableLarge.rows;
    }

    setSearchWidth(width) {
        if (this.searchElement) {
            this.searchElement.nativeElement.style.width = `${width}px`;
        }
    }

    setTableDimensions() {
        const windowSize = this.scrollMechanicsService.windowSizeSubject.getValue();

        const ELEMENTS_HEIGHT = this.dimensions.reduce((prev, curr) => prev + curr, 0);
        const THEAD_HEIGHT = this.tableHeaderElement.nativeElement.offsetHeight;
        const PADDING = 16;
        const PAGINATION_HEIGHT = 64;

        let availSpace = windowSize.height - 4 * PADDING - ELEMENTS_HEIGHT - THEAD_HEIGHT - 48 - PAGINATION_HEIGHT;

        if (this.tableTitleElement) {
            availSpace -= this.tableTitleElement.nativeElement.offsetHeight;
        }

        let pageSize = Math.ceil(availSpace / NxHealthLayoutService.ROW_HEIGHT);
        if (pageSize < 5) {
            pageSize = 5;
        }
        this.pageSize = pageSize;

        // TODO: Remove in CLOUD-4233
        // setTimeout(() => {
            if (this.tableElement.nativeElement.offsetWidth !== 0) {
                this.tableWidth = this.tableElement.nativeElement.offsetWidth;
            }
            this.healthService.tableReady = true;
        // }, 100);

    }
}
