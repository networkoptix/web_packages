import {
    AfterViewInit,
    Directive,
    ElementRef,
    EventEmitter,
    Output
} from '@angular/core';

@Directive({
    selector: '[NxProjectedLinkHandler]'
})
export class NxProjectedLinkHandler implements AfterViewInit {
    @Output('NxProjectedLinkHandler')
    handler = new EventEmitter<{ url: string, target: string }>();

    constructor(private el: ElementRef) {}

    ngAfterViewInit() {
        Array.from(this.el.nativeElement.querySelectorAll('a')).forEach(
            (el: HTMLAnchorElement) => {
                const linkEmitter = e => {
                    const url = (el.href as any)?.baseVal ?? el.href;
                    if (url) {
                        this.handler.emit({ url, target: el.target });
                    }
                    e.preventDefault();
                };
                el.addEventListener('click', linkEmitter);
            }
        );
    }
}
