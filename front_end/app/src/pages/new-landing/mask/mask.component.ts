import { AfterViewInit, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { NxConfigService, IConfig } from '@services/nx-config';
import { Platform } from '@angular/cdk/platform';

@Component({
    selector    : 'nx-mask',
    templateUrl : './mask.component.html',
    styleUrls   : ['./mask.component.scss']
})
export class NxMaskComponent implements OnChanges, AfterViewInit {
    @Input() scrollPosition: number;
    @Input() introAnimationFinished = false;
    @Input() graphicLoaded: boolean;
    @Input() maskMaxSizeScrollPosition: number;
    @Output() isFinishedLoading = new EventEmitter<boolean>();
    componentInitialized = false;
    scale =  2;
    isSafari: boolean;

    calculationProperties = {
        scrollSpeedCoefficient : 0.0005,
        maskCoefficient        : 2.4
    }

    CONFIG: IConfig

    constructor(configService: NxConfigService, platform: Platform) {
        this.CONFIG = configService.getConfig();
        this.isSafari = platform.SAFARI;
    }

    getMaskScale = (scrollPosition: number) => {
        return ((150 / (1 - (scrollPosition * this.calculationProperties.scrollSpeedCoefficient * this.calculationProperties.maskCoefficient))) / 150) * 0.166;
    }

    ngOnChanges() {
        // if (this.introAnimationFinished && this.scrollPosition < this.maskMaxSizeScrollPosition) {
        if (this.scrollPosition < this.maskMaxSizeScrollPosition) {
            this.scale = this.getMaskScale(this.scrollPosition);
        } else {
            this.scale = this.getMaskScale(this.maskMaxSizeScrollPosition);
        }
    }

    ngAfterViewInit() {
        setTimeout(() => {
            this.isFinishedLoading.emit(true);
            this.componentInitialized = true;
        }, 0);
    }

    ngOnDestroy() {
        this.isFinishedLoading.emit(false);
    }
}
