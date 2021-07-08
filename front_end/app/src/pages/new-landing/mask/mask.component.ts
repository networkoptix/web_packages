import { AfterViewInit, Component, Input, OnChanges } from '@angular/core';
import { NxConfigService, IConfig } from '@services/nx-config';
import { Platform } from '@angular/cdk/platform';
import { NxLandingService } from '../landing.service';

@Component({
    selector    : 'nx-mask',
    templateUrl : './mask.component.html',
    styleUrls   : ['./mask.component.scss']
})
export class NxMaskComponent implements OnChanges, AfterViewInit {
    @Input() scrollPosition = 820;
    @Input() graphicLoaded: boolean;
    componentInitialized = false;
    scale =  2;
    isSafari: boolean;

    calculationProperties = {
        scrollSpeedCoefficient : 0.0005,
        maskCoefficient        : 2.4
    }

    CONFIG: IConfig

    constructor(configService: NxConfigService, platform: Platform, public landingService: NxLandingService) {
        this.CONFIG = configService.getConfig();
        this.isSafari = platform.SAFARI;
    }

    getMaskScale = (scrollPosition: number) => {
        return ((150 / (1 - (scrollPosition * this.calculationProperties.scrollSpeedCoefficient * this.calculationProperties.maskCoefficient))) / 150) * 0.166;
    }

    ngOnChanges() {
        // if (this.introAnimationFinished && this.scrollPosition < this.maskMaxSizeScrollPosition) {
        if (this.scrollPosition < this.landingService.scrollBreakpoints.maskMaxSize) {
            this.scale = this.getMaskScale(this.scrollPosition);
        } else {
            this.scale = this.getMaskScale(this.landingService.scrollBreakpoints.maskMaxSize);
        }
    }

    ngAfterViewInit() {
        setTimeout(() => {
            this.landingService.maskFinishedLoading$.next(true);
        }, 0);
    }

    ngOnDestroy() {
        this.landingService.maskFinishedLoading$.next(false);
    }
}
