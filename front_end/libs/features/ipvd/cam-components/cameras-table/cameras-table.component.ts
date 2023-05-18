import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';

import staticLang from '@app/language/language_i18n_static.json';
import { icons } from '@lib/variables/static-variables';
import { Disclaimer, FilteredCamera, IpvdParams } from '@pages/ipvd/ipvd.types';
import { Cameras } from '@services/nx-cloud-api/nx-cloud-api.types';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NgChanges } from '@utils/ng-changes';

interface Header {
    name: string;
    value: string;
    sort?: string;
    align?: string;
}

@Component({
    selector: 'nx-cameras-table',
    templateUrl: 'cameras-table.component.html',
    styleUrls: ['cameras-table.component.scss'],
})
export class NxCamerasTableComponent implements OnChanges {
    @Input() elements: FilteredCamera[];
    @Input() allowedParameters: string[];
    @Input() activeCamera: Cameras;
    @Input() params: IpvdParams;

    @Output() public onRowClick = new EventEmitter<FilteredCamera>();
    @Output() public onFeedbackClick = new EventEmitter<void>();

    LANG = staticLang;
    CONFIG: IConfig;

    serviceHeaders: Header[];
    cmsHeaders: Header[];
    disclaimerParams: Disclaimer;
    selectedHeader: string;
    showHeaders: Header[];
    showRecords: FilteredCamera[];
    headerFlow: string[];
    headerFlowCSM: string[];
    headerFlowService: string[];
    selectedCamera: string;
    pages: number;
    debug: boolean;

    cameraHeaders: Header[];
    tableClasses: string[] = [];
    // private beta: boolean;

    icons = icons;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
        this.serviceHeaders = [
            { name: 'count', value: this.LANG.ipvd.count, sort: 'number' },
            { name: 'resolutionArea', value: this.LANG.ipvd.resolutionArea, sort: 'number' },
        ];

        this.cmsHeaders = [
            {
                name: 'isAnalyticsSupported',
                value: this.LANG.ipvd.isAnalyticsSupported,
                sort: 'boolean',
                align: 'center',
            },
        ];

        this.cameraHeaders = [
            { name: 'vendor', value: this.LANG.ipvd.vendor, sort: 'string' },
            { name: 'model', value: this.LANG.ipvd.model, sort: 'string' },
            { name: 'hardwareType', value: this.LANG.ipvd.hardwareType, sort: 'string' },
            { name: 'maxResolution', value: this.LANG.ipvd.maxResolution, sort: 'resolution' },
            { name: 'maxFps', value: this.LANG.ipvd.maxFps, sort: 'number', align: 'center' },
            { name: 'primaryCodec', value: this.LANG.ipvd.primaryCodec, sort: 'string' },
            {
                name: 'isAudioSupported',
                value: this.LANG.ipvd.isAudioSupported,
                sort: 'boolean',
                align: 'center',
            },
            {
                name: 'isPtzSupported',
                value: this.LANG.ipvd.isPtzSupported,
                sort: 'boolean',
                align: 'center',
            },
            {
                name: 'isFisheye',
                value: this.LANG.ipvd.isFisheye,
                sort: 'boolean',
                align: 'center',
            },
            {
                name: 'isMdSupported',
                value: this.LANG.ipvd.isMdSupported,
                sort: 'boolean',
                align: 'center',
            },
            {
                name: 'isIoSupported',
                value: this.LANG.ipvd.isIoSupported,
                sort: 'boolean',
                align: 'center',
            },
        ];

        this.headerFlow = [
            'vendor',
            'model',
            'hardwareType',
            'maxResolution',
            'maxFps',
            'primaryCodec',
            'isAudioSupported',
            'isPtzSupported',
            'isFisheye',
            'isMdSupported',
            'isIoSupported',
        ];

        this.headerFlowCSM = ['isAnalyticsSupported'];
        this.headerFlowService = ['count', 'resolutionArea'];

        this.disclaimerParams = {
            companyName: this.CONFIG.company.name,
            vmsName: this.CONFIG.vmsName,
        };
    }

    ngOnChanges(changes: NgChanges<NxCamerasTableComponent>): void {
        if (changes.elements?.currentValue) {
            this.showRecords = [...this.elements];
            this.showRecords.map((element): FilteredCamera => {
                if (element.isAptzSupported) {
                    delete element.isPtzSupported;
                }
                if (element.isTwAudioSupported) {
                    delete element.isAudioSupported;
                }
                delete element.sortKey;

                return element;
            });
        }

        if (changes.allowedParameters?.currentValue) {
            if (this.allowedParameters.find(elm => elm === 'isAnalyticsSupported')) {
                this.tableClasses.push('analytics');
                this.showHeaders = [...this.cameraHeaders, ...this.cmsHeaders];
                this.headerFlow = [...this.headerFlow, ...this.headerFlowCSM];
            }

            if (this.allowedParameters.find(elm => elm === 'resolutionArea')) {
                this.tableClasses.push('service');
                this.showHeaders = [
                    ...this.cameraHeaders,
                    ...this.cmsHeaders,
                    ...this.serviceHeaders,
                ];
                this.headerFlow = [
                    ...this.headerFlow,
                    ...this.headerFlowCSM,
                    ...this.headerFlowService,
                ];
            }
        }
    }

    isBoolIcon(value: unknown): boolean {
        return typeof value === 'boolean' || value === 0 || value === '0x0';
    }

    trackItem(key: unknown, value: unknown): unknown | undefined {
        return key || undefined;
    }

    onRowAction(selected: FilteredCamera): void {
        this.onRowClick.emit({ ...selected });
    }
}
