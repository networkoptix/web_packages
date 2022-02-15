import {
    AfterViewInit,
    Component,
    Inject,
    Input,
    LOCALE_ID,
    OnChanges,
    OnDestroy,
    SimpleChanges,
    TemplateRef,
    ViewContainerRef,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { of, Subject, Subscription, timer } from 'rxjs';
import { delay, takeUntil } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { POS_STRATEGY } from '@components/popover/popover-config';
import { PopoverRef } from '@components/popover/popover-ref';
import { NxPopoverService } from '@components/popover/popover.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Storage, STORAGE_STATUS } from '@services/system.service/storage-manager/storage';
import { bitsToString } from '@utils/bits-to-string';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-storage-size-component',
    templateUrl: 'size.component.html',
    styleUrls: ['size.component.scss']
})
export class NxStorageSizeComponent implements OnDestroy, OnChanges, AfterViewInit {
    @Input() store: Storage;
    @Input() cachedSizes: {[key: string]: { vms: number, total: number }} = {}

    LANG: LanguageI18NStaticTypes;

    destroy$ = new Subject();
    targets: object[] = [];
    popover: PopoverRef;

    loading: boolean;
    showStorage: boolean;
    totalSpace: string;
    reserved: string;
    reservedPercentage: number;
    used: string;
    usedPercentage: number;
    available: string;
    availPercentage: number;
    archive: string;
    archivePercentage: number;
    STATUS: any;

    get inaccessible() {
        return [
            STORAGE_STATUS.INACCESSIBLE,
            STORAGE_STATUS.BEING_CHECKED
        ].includes(this.store.status);
    }

    get cachedSizesClean() {
        return Object.entries(
            this.cachedSizes
        ).reduce((
            cachedSizes, [key, store]
        ) => store.total > 0
            ? { ...cachedSizes, [key]: store }
            : cachedSizes,
        {});
    }

    constructor(
        languageService: NxLanguageProviderService,
        private popoverService: NxPopoverService,
        private _viewContainerRef: ViewContainerRef,
        @Inject(LOCALE_ID) private locale: string,
    ) {
        this.LANG = languageService.translations;
        this.STATUS = STORAGE_STATUS;
    }

    showLegend(template: TemplateRef<any>, target: any): void {
        timer(300)
            .pipe(
                takeUntil(this.destroy$)
            ).subscribe(() => {
                this.popover = this.popoverService.open(
                    template,
                    target,
                    {
                        panelClass: 'size-popover',
                        arrowOffset: 4,
                        positionStrategy: POS_STRATEGY.BOTTOM
                    },
                    this._viewContainerRef);
            });
    }

    closeLegend() {
        this.popover?.close();
        this.popover = undefined;
        this.destroy$.next();
    }

    ngAfterViewInit() {
    }

    ngOnDestroy() {
        this.closeLegend();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.store.currentValue) {
            this.init();
        }
    }

    init() {
        this.store.totalSpace = this.cachedSizesClean?.[this.store.storageId]?.total || this.store.totalSpace;
        this.store.vmsSpace = this.cachedSizesClean?.[this.store.storageId]?.vms || this.store.vmsSpace;
        if (this.store.status === STORAGE_STATUS.INACCESSIBLE) {
            this.totalSpace = '&mdash;';
            this.reserved = '0';
            this.reservedPercentage = 0;
            this.used = '0';
            this.usedPercentage = 0;
            this.available = '0';
            this.availPercentage = 100;

            this.archive = '&mdash;';
            this.archivePercentage = 0;

            return;
        }

        if (this.store.freeSpace === undefined) {
            this.store.freeSpace = this.store.totalSpace - this.store.vmsSpace;
        }

        if (this.store.reservedSpace === undefined) {
            this.store.reservedSpace = 0;
        }

        const usedSpace = this.store.totalSpace - this.store.freeSpace - this.store.vmsSpace;
        this.totalSpace = this.toFriendlyBytes(this.store.totalSpace) || '&mdash;';
        this.reserved = this.toFriendlyBytes(this.store.reservedSpace);
        this.reservedPercentage = this.toPercentageOfTotal(this.store.reservedSpace);
        this.used = this.toFriendlyBytes(usedSpace);
        this.usedPercentage = this.toPercentageOfTotal(usedSpace);
        this.available = this.toFriendlyBytes(this.store.freeSpace - this.store.reservedSpace);
        this.availPercentage = 100 - this.reservedPercentage;

        this.archive = '&mdash;';
        this.archivePercentage = 0;

        if (this.store.vmsSpace) {
            this.archive = this.toFriendlyBytes(this.store.vmsSpace);
            this.archivePercentage = this.toPercentageOfTotal(this.store.vmsSpace);
        }
    }

    clamp(input, max, min = 0) {
        return Math.min(Math.max(input, min), max);
    }

    toPercentageOfTotal(size) {
        return Math.round((size / this.store.totalSpace) * 100);
    }

    toFriendlyBytes(bits, fractionGb = true) {
        if (!+bits || bits < 0) {
            return '&mdash;';
        }
        const { locale } = this;
        const gbBits = 1073741824;
        const roundTo = bits < gbBits / 2 ? gbBits / 1024 : gbBits / (fractionGb ? 10 : 1);
        const friendlySize = bitsToString(bits, { locale, roundTo });
        if (friendlySize === '0 B') {
            return '< 1 MB';
        }

        if (!fractionGb) {
            return friendlySize;
        }

        const [size, units] = friendlySize.split(' ');
        const fixed = {
            GB: 1,
            TB: 2
        };
        return `${parseFloat(size).toFixed(fixed[units])} ${units}`;
    }
}
