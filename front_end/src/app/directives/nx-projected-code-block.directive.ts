import { AfterViewInit, Directive, ElementRef } from '@angular/core';

@Directive({
    selector: '[NxProjectedLinkHandler]'
})
export class NxProjectedCodeBlock implements AfterViewInit {
    constructor(private el: ElementRef) {}

    ngAfterViewInit(): void {
        Array.from(this.el.nativeElement.querySelectorAll('pre')).forEach(
            (el: HTMLPreElement) => {
                const nodes = el.innerHTML.split('<br>');
                el.innerHTML = nodes.map(node => `<span>${node || '&nbsp;'}</span>`).join('');
                if (nodes.length < 3) {
                    el.classList.add('no-numbers');
                }
            }
        );
    }
}
