import { Directive, ElementRef, OnInit, Renderer2 } from '@angular/core';

import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';

@Directive({ selector: '[nxScrollMechanics]', standalone: true })
export class NxScrollMechanicsDirective implements OnInit {
    constructor(
        private element: ElementRef,
        private renderer: Renderer2,
        private scrollMechanicsService: NxScrollMechanicsService,
    ) {}

    ngOnInit(): void {
        setTimeout(() => {
            this.renderer.setStyle(this.element.nativeElement, 'width', '100%');

            this.scrollMechanicsService.elementViewWidthSubject.subscribe(() => {
                const width = this.scrollMechanicsService.elementViewWidth;
                this.renderer.setStyle(
                    this.element.nativeElement,
                    'width',
                    width > 0 ? width - 8 /* -gutter */ + 'px' : '100%',
                );
            });
        });
    }
}
