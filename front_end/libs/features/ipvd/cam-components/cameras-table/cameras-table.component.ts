import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';

import staticLang from '@app/language/language_i18n_static.json';
import { icons } from '@lib/variables/static-variables';
import { Disclaimer, FilteredCamera, IpvdParams } from '@pages/ipvd/ipvd.types';
import { Cameras } from '@services/nx-cloud-api/nx-cloud-api.types';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NgChanges } from '@utils/ng-changes';

@Component({
    selector: 'nx-cameras-table',
    templateUrl: 'cameras-table.component.html',
    styleUrls: ['cameras-table.component.scss'],
})
export class NxCamerasTableComponent implements OnInit, OnChanges {
    @Input() elements: FilteredCamera[];
    @Input() allowedParameters: string[];
    @Input() activeCamera: Cameras;
    @Input() params: IpvdParams;

    @Output() public onRowClick = new EventEmitter<FilteredCamera>();
    @Output() public onFeedbackClick = new EventEmitter<void>();

    LANG = staticLang;
    CONFIG: IConfig;

    serviceHeaders: Record<string, string>[];
    disclaimerParams: Disclaimer;
    selectedHeader: string;
    showHeaders: Record<string, string>[];
    headerFlow: string[];
    selectedCamera: string;
    pages: number;
    debug: boolean;

    private cameraHeaders: Record<string, string>[];
    // private beta: boolean;

    icons = icons;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
        this.serviceHeaders = [
            { name: 'count', value: this.LANG.ipvd.count },
            { name: 'resolutionArea', value: this.LANG.ipvd.resolutionArea },
        ];

        this.cameraHeaders = [
            { name: 'vendor', value: this.LANG.ipvd.vendor },
            { name: 'model', value: this.LANG.ipvd.model },
            { name: 'hardwareType', value: this.LANG.ipvd.hardwareType },
            { name: 'maxResolution', value: this.LANG.ipvd.maxResolution },
            { name: 'maxFps', value: this.LANG.ipvd.maxFps },
            { name: 'primaryCodec', value: this.LANG.ipvd.primaryCodec },
            { name: 'isAudioSupported', value: this.LANG.ipvd.isAudioSupported },
            { name: 'isPtzSupported', value: this.LANG.ipvd.isPtzSupported },
            { name: 'isFisheye', value: this.LANG.ipvd.isFisheye },
            { name: 'isMdSupported', value: this.LANG.ipvd.isMdSupported },
            { name: 'isIoSupported', value: this.LANG.ipvd.isIoSupported },
            { name: 'isAnalyticsSupported', value: this.LANG.ipvd.isAnalyticsSupported },
            { name: 'count', value: this.LANG.ipvd.count },
            { name: 'resolutionArea', value: this.LANG.ipvd.resolutionArea },
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
            'isAnalyticsSupported',
            'count',
            'resolutionArea',
        ];

        this.disclaimerParams = {
            companyName: this.CONFIG.company.name,
            vmsName: this.CONFIG.vmsName,
        };
    }

    ngOnInit(): void {
        this.showHeaders = this.cameraHeaders;
    }

    ngOnChanges(changes: NgChanges<NxCamerasTableComponent>): void {
        if (changes.elements.currentValue) {
            this.elements.map((element): FilteredCamera => {
                if (element.isAptzSupported) {
                    element.isPtzSupported = true;
                }
                if (element.isTwAudioSupported) {
                    element.isAudioSupported = true;
                }
                delete element.isAptzSupported;
                delete element.isTwAudioSupported;
                delete element.sortKey;

                return element;
            });
        }
    }

    isBoolIcon(value: unknown): boolean {
        return typeof value === 'boolean' || value === 0 || value === '0x0';
    }
}
