import { Platform } from '@angular/cdk/platform';
import { Component, Inject, Input, OnChanges } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { WINDOW } from '@services/window-provider';

import { NxLandingService } from '../landing.service';

@UntilDestroy()
@Component({
    selector: 'nx-learn-more',
    templateUrl: './learn-more.component.html',
    styleUrls: ['./learn-more.component.scss'],
})
export class NxLearnMoreComponent implements OnChanges {
    @Input() scrollPosition: number;
    @Input() screenHeight: number;

    visible = true;
    isVisibleBreakpoints = {
        scrollPosition: 91,
        screenHeight: 690
    };

    constructor(
        public landingService: NxLandingService,
        private platform: Platform,
        private scrollMechanics: NxScrollMechanicsService,
        @Inject(WINDOW) private window: Window,
    ) {}

    ngOnInit(): void {
        this.visible = this.renderLearnMore();
    }

    renderLearnMore = (): boolean => {
        if (
            this.scrollPosition > this.isVisibleBreakpoints.scrollPosition ||
            this.screenHeight < this.isVisibleBreakpoints.screenHeight
        ) {
            return false;
        }
        return true;
    };

    onClick(): void {
        if (this.landingService.contentStartRef) {
            // Scroll behavior smooth not supported in safari...
            // if smooth scroll is desired might need different implementation
            this.landingService.contentStartRef.nativeElement.scrollIntoView({
                behavior: 'smooth'
            });
            if (this.platform.SAFARI) {
                this.scrollMechanics.windowScrollSubject.next(this.window.scrollY);
            }
        }
    }

    ngOnChanges(): void {
        this.visible = this.renderLearnMore();
    }
}
