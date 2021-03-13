import { AfterViewInit, Directive, ElementRef, EventEmitter, Output } from '@angular/core';

@Directive({
    selector: '[NxProjectedLinkHandler]'
})
export class NxProjectedLinkHandler implements AfterViewInit {
    @Output('NxProjectedLinkHandler')
    handler = new EventEmitter<{url: string, target: string}>();

    constructor(private el: ElementRef) {}

    ngAfterViewInit() {
        Array.from(this.el.nativeElement.querySelectorAll('a')).forEach(
            (el: HTMLAnchorElement) => {
                const linkEmitter = (e) => {
                    this.handler.emit({ url: el.href, target: el.target });
                    e.preventDefault();
                };
                el.addEventListener('click', linkEmitter);
            }
        );
    }
}
