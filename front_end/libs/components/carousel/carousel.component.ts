import { trigger, style, animate, transition } from '@angular/animations';
import { Component, Input, OnInit } from '@angular/core';

import { animations } from '@lib/variables/static-variables';
import { mod } from '@utils/general';

@Component({
    selector: 'nx-carousel',
    templateUrl: 'carousel.component.html',
    styleUrls: ['carousel.component.scss'],
    animations: [
        trigger('visibilityChange', [
            transition('enter => leave', [
                style({
                    opacity: 1,
                    visibility: 'visible',
                }),
                animate(
                    animations.carouselImage.leave,
                    style({ opacity: 0, visibility: 'hidden' }),
                ),
            ]),
            transition('* => enter', [
                style({
                    opacity: 0,
                    visibility: 'hidden',
                }),
                animate(
                    animations.carouselImage.enter,
                    style({ opacity: 1, visibility: 'visible' }),
                ),
            ]),
        ]),
    ],
})
export class NxCarouselComponent implements OnInit {
    @Input() screenshots;
    @Input() type?: string;

    imageCount: number;
    currentIndex = 0;
    images: any = [];
    caption: string;

    ngOnInit(): void {
        this.caption = '';
        this.imageCount = this.screenshots.length;

        if (this.imageCount) {
            this.setCaption();
        }
    }

    previousElement(): void {
        this.currentIndex = mod(this.currentIndex - 1, this.screenshots.length);
        this.setCaption();
    }

    nextElement(): void {
        this.currentIndex = mod(this.currentIndex + 1, this.screenshots.length);
        this.setCaption();
    }

    setIndex(i): void {
        this.currentIndex = i;
        this.setCaption();
    }

    setCaption(): void {
        this.caption = this.screenshots[this.currentIndex].caption;
    }
}
