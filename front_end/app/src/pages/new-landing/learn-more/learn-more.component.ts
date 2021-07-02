import { Component, ElementRef, Input, OnChanges, OnInit } from '@angular/core';
@Component({
    selector    : 'nx-learn-more',
    templateUrl : './learn-more.component.html',
    styleUrls   : ['./learn-more.component.scss']
})
export class NxLearnMoreComponent implements OnInit, OnChanges {
    @Input() screenHeight: number
    @Input() scrollPosition: number
    @Input() contentStartRef: ElementRef;
    visible = true

    isVisibleBreakpoints = {
        scrollPosition : 91,
        screenHeight   : 690
    }

    constructor() {}

    ngOnInit(): void {
        this.visible = this.renderLearnMore();
    }

    renderLearnMore = () => {
        if (this.scrollPosition > this.isVisibleBreakpoints.scrollPosition || this.screenHeight < this.isVisibleBreakpoints.screenHeight) return false;
        return true;
    }

    onClick() {
        if (this.contentStartRef) {
            this.contentStartRef.nativeElement.scrollIntoView({ behavior: 'smooth' });
        }
    }

    ngOnChanges() {
        this.visible = this.renderLearnMore();
    }
}
