import { trigger, style, animate, transition } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';

import { Screenshot } from '@services/nx-cloud-api/nx-cloud-api.types';
import { mod } from '@utils/general';

@Component({
    selector: 'nx-carousel',
    templateUrl: 'carousel.component.html',
    styleUrls: ['carousel.component.scss'],
    imports: [CommonModule],
    standalone: true,
    animations: [
        trigger('visibilityChange', [
            transition('enter => leave', [
                style({
                    opacity: 1,
                    visibility: 'visible',
                }),
                animate('0.25s ease-out', style({ opacity: 0, visibility: 'hidden' })),
            ]),
            transition('* => enter', [
                style({
                    opacity: 0,
                    visibility: 'hidden',
                }),
                animate('0.25s ease-in', style({ opacity: 1, visibility: 'visible' })),
            ]),
        ]),
    ],
})
export class NxCarouselComponent implements OnInit {
    @Input() screenshots: Screenshot[] = [];
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
