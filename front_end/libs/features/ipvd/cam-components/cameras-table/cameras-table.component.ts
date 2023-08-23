import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';

import staticLang from '@app/language/language_i18n_static.json';
import { icons } from '@lib/variables/static-variables';
import { csvData, Disclaimer, FilteredCamera, IpvdParams } from '@pages/ipvd/ipvd.types';
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

type CsvData = Record<string, string | number>[];

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
    headerFlowBase: string[];
    headerFlowCSM: string[];
    headerFlowService: string[];
    pages: number;
    debug: boolean;

    cameraHeaders: Header[];
    tableClasses: string[] = [];
    // private beta: boolean;

    icons = icons;

    // Options for the CSV export
    public csvFilename: number;
    public csvCameraData: CsvData;
    /* Missing filename and keys property, but README says keys is optional
    and filename is provided as a property on the element so probably fine */
    public csvOptions = {
        fieldSeparator: ',',
        headers: [
            'Vendor',
            'Model',
            'Type',
            'Max Resolution',
            'Max FPS',
            'Codec',
            'Audio',
            '2-Way Audio',
            'PTZ',
            'Advanced PTZ',
            'Fisheye',
            'Motion',
            'I/O',
        ],
        showTitle: true,
        title: 'Camera List',
    };

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
                sort: 'audio',
                align: 'center',
            },
            {
                name: 'isPtzSupported',
                value: this.LANG.ipvd.isPtzSupported,
                sort: 'ptz',
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

        this.headerFlowBase = [
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
        this.headerFlow = [];

        this.disclaimerParams = {
            companyName: this.CONFIG.company.name,
            vmsName: this.CONFIG.vmsName,
        };
    }

    ngOnChanges(changes: NgChanges<NxCamerasTableComponent>): void {
        if (changes.elements?.currentValue) {
            this.showRecords = this.elements;
            this.showRecords.map((element): FilteredCamera => {
                element.isAptzSupported
                    ? delete element.isPtzSupported
                    : delete element.isAptzSupported;

                element.isTwAudioSupported
                    ? delete element.isAudioSupported
                    : delete element.isTwAudioSupported;

                // delete element.sortKey;

                return element;
            });
        }

        if (changes.allowedParameters?.currentValue) {
            let showAnalytics = false;
            const showHeaders = [...this.cameraHeaders];
            const headerFlow = [...this.headerFlowBase];

            if (this.allowedParameters.find(elm => elm === 'isAnalyticsSupported')) {
                showAnalytics = true;
                this.tableClasses.push('analytics');
                this.csvOptions.headers.push(this.LANG.ipvd.isAnalyticsSupported);
                showHeaders.push(...this.cmsHeaders);
                headerFlow.push(...this.headerFlowCSM);
            }

            if (this.allowedParameters.find(elm => elm === 'resolutionArea')) {
                this.tableClasses.push('service');
                showHeaders.push(...this.cmsHeaders, ...this.serviceHeaders);
                headerFlow.push(...this.headerFlowCSM, ...this.headerFlowService);
            }
            this.showHeaders = showHeaders;
            this.headerFlow = headerFlow;

            this.csvFilename = Date.now();
            this.csvCameraData = this.getCsvData(showAnalytics);
        }
    }

    getCsvData(showAnalytics: boolean): CsvData {
        return this.elements.map(camera => {
            const csv: Partial<csvData> = {
                Vendor: camera.vendor,
                Model: camera.model,
                Type: camera.hardwareType,
                'Max Resolution': camera.maxResolution,
                'Max FPS': camera.maxFps,
                Codec: camera.primaryCodec,
                Audio: this.yesNo(camera.isAudioSupported),
                '2-Way Audio': this.yesNo(camera.isTwAudioSupported),
                PTZ: this.yesNo(camera.isPtzSupported),
                'Advanced PTZ': this.yesNo(camera.isAptzSupported),
                Fisheye: this.yesNo(camera.isFisheye),
                Motion: this.yesNo(camera.isMdSupported),
                'I/O': this.yesNo(camera.isIoSupported),
            };

            if (showAnalytics) {
                csv.Analytics = this.yesNo(camera.isAnalyticsSupported);
            }

            return csv;
        });
    }

    yesNo(bVal: unknown): string {
        if (bVal === undefined || bVal === null) {
            return 'Unknown';
        }

        return bVal ? 'Yes' : 'No';
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
