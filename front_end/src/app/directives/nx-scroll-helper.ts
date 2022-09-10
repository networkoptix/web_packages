import { Directive, HostListener } from '@angular/core';

import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';

@Directive({ selector: '[nxScrollHelper]' })
export class NxScrollHelperDirective {
    constructor(
        private scrollMechanicsService: NxScrollMechanicsService
    ) {}

    @HostListener('scroll', ['$event'])
    public onListenerTriggered(event: Event): void {
        this.scrollMechanicsService.windowScroll =
            (event.target as HTMLElement).scrollTop;
    }
}
