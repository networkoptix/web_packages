import { Directive, HostListener }  from '@angular/core';
import { NxScrollMechanicsService } from '../services';

@Directive({ selector: '[nxScrollHelper]' })
export class NxScrollHelperDirective {
    constructor(
        private scrollMechanicsService: NxScrollMechanicsService
    ) {}

    @HostListener('scroll', ['$event'])
    public onListenerTriggered(event: any): void {
        this.scrollMechanicsService.windowScroll = event.target.scrollTop;
    }
}
