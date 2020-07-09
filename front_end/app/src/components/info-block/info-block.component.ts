import { Component, Input, OnInit } from '@angular/core';
import { NxConfigService, IConfig } from '../../services/nx-config';

export enum InfoBlockSize {
    COMPACT='compact',
    FULL='full'
}

export enum InfoBlockStyle {
    LIGHT='light',
    DARK='dark'
}

export enum InfoLineStyle {
    CONDENSED = 'condensed',
    WIDE = 'wide'
}

export enum InfoDetailClass {
    ERROR='error',
    WARNING='warning'
}

@Component({
    selector    : 'nx-info-block',
    templateUrl : 'info-block.component.html',
    styleUrls   : ['info-block.component.scss']
})
export class NxInfoBlockComponent implements OnInit {
    @Input() sectionsOrColumns: InfoBlockColumns | InfoBlockSections;
    @Input() infoBlockStyle: InfoBlockStyle = InfoBlockStyle.LIGHT;
    @Input() infoBlockSize: InfoBlockSize = InfoBlockSize.FULL;
    @Input() infoLineStyle: InfoLineStyle = InfoLineStyle.WIDE;
    @Input() removeTopMargin = false;

    CONFIG: IConfig;
    singleColumn: boolean;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.config;
    }

    ngOnInit() {
        this.singleColumn = this.sectionsOrColumns[0] && !this.sectionsOrColumns[0][0];
    }
}

export class InfoBlockLine <Name = string, Value = string, Visibility = boolean> {
    constructor(
        public name: Name,
        public value: Value,
        public show?: Visibility,
        public customClass?: InfoDetailClass,
        public icon?: string
    ) {}
}

export class InfoBlockSection<Heading = string> {
    constructor(public lines: InfoBlockLine[], public heading?: Heading) {}
}

export type InfoBlockSections = InfoBlockSection[];

export type InfoBlockColumns = InfoBlockSections[];
