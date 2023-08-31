import { Platform } from '@angular/cdk/platform';
import { AfterViewInit, Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';

import { images } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';

import { NxLandingService } from '../landing.service';

@Component({
    selector: 'nx-mask',
    templateUrl: './mask.component.html',
    styleUrls: ['./mask.component.scss'],
})
export class NxMaskComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
    @Input() scrollPosition: number = 820;
    componentInitialized = false;
    scale = 2;
    isSafari: boolean;
    images = images;

    calculationProperties = {
        scrollSpeedCoefficient: 0.0005,
        maskCoefficient: 2.4,
    };

    constructor(platform: Platform, public landingService: NxLandingService) {
        this.isSafari = platform.SAFARI;
    }

    getMaskScale = (scrollPosition: number): number => {
        const { scrollSpeedCoefficient, maskCoefficient } = this.calculationProperties;
        return 0.166 * (1 - scrollPosition * scrollSpeedCoefficient * maskCoefficient);
    };

    ngOnInit(): void {
        // 1200 ms is an arbitrary number, it just matters that the scale is changed before the intro animation is finished
        // otherwise angular will re-check the scale and apply the initial max size to it again when it should be small
        if (!this.landingService.introAnimationFinished$.value) {
            setTimeout(() => {
                this.scale = 0.15;
            }, 1200);
        }
    }

    ngOnChanges(changes: NgChanges<NxMaskComponent>): void {
        if (
            this.landingService.introAnimationFinished$.value &&
            changes.scrollPosition.previousValue !== changes.scrollPosition.currentValue
        ) {
            if (this.scrollPosition < this.landingService.scrollBreakpoints.maskMaxSize) {
                this.scale = this.getMaskScale(this.scrollPosition);
            } else {
                this.scale = this.getMaskScale(this.landingService.scrollBreakpoints.maskMaxSize);
            }
        }
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.landingService.maskFinishedLoading$.next(true);
        }, 0);
    }

    ngOnDestroy(): void {
        this.landingService.maskFinishedLoading$.next(false);
    }
}
