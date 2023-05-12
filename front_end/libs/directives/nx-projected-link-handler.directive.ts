import { AfterViewInit, Directive, ElementRef, EventEmitter, Output } from '@angular/core';

function isHtmlAnchor(el: HTMLAnchorElement | SVGAElement): el is HTMLAnchorElement {
    return typeof el.href === 'string';
}

@Directive({
    selector: '[NxProjectedLinkHandler]',
})
export class NxProjectedLinkHandler implements AfterViewInit {
    @Output('NxProjectedLinkHandler')
    handler = new EventEmitter<{ url: string; target: string }>();

    constructor(private el: ElementRef<HTMLElement>) {}

    ngAfterViewInit(): void {
        this.el.nativeElement.querySelectorAll<HTMLAnchorElement | SVGAElement>('a').forEach(el => {
            const linkEmitter = (e: MouseEvent): void => {
                let url: string;
                let target: string;
                if (isHtmlAnchor(el)) {
                    url = el.href;
                    target = el.target;
                } else {
                    url = el.href.baseVal;
                    target = el.target.baseVal;
                }
                if (url) {
                    this.handler.emit({ url, target });
                }
                e.preventDefault();
            };
            el.addEventListener('click', linkEmitter);
        });
    }
}
