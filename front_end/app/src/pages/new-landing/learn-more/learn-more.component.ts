import { Component, ElementRef, Input, OnChanges, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NxLandingService } from '../landing.service';

@UntilDestroy()
@Component({
    selector    : 'nx-learn-more',
    templateUrl : './learn-more.component.html',
    styleUrls   : ['./learn-more.component.scss']
})
export class NxLearnMoreComponent {
    @Input() scrollPosition: number
    @Input() screenHeight: number

    visible = true
    isVisibleBreakpoints = {
        scrollPosition : 91,
        screenHeight   : 690
    }

    constructor(public landingService: NxLandingService) {}

    ngOnInit(): void {
        this.visible = this.renderLearnMore();
    }

    renderLearnMore = () => {
        if (this.scrollPosition > this.isVisibleBreakpoints.scrollPosition || this.screenHeight < this.isVisibleBreakpoints.screenHeight) return false;
        return true;
    }

    onClick() {
        if (this.landingService.contentStartRef) {
            this.landingService.contentStartRef.nativeElement.scrollIntoView({ behavior: 'smooth' });
        }
    }

    ngOnChanges() {
        this.visible = this.renderLearnMore();
    }
}
