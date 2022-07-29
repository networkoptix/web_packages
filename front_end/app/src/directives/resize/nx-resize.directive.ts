import {
    Directive,
    ElementRef,
    EventEmitter,
    Output,
    OnDestroy
} from '@angular/core';

const entriesMap = new WeakMap();

interface Size {
    width: number,
    height: number
}

const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
        if (entriesMap.has(entry.target)) {
            const comp = entriesMap.get(entry.target);
            comp._resizeCallback(entry);
        }
    }
});

@Directive({ selector: '[resize]' })
export class NxResizeObserver implements OnDestroy {
    @Output() resize = new EventEmitter<Size>();

    constructor(
        private el: ElementRef
    ) {
        const target = this.el.nativeElement;
        entriesMap.set(target, this);
        observer.observe(target);
    }

    _resizeCallback({ contentRect: { width, height } }: { contentRect: Size }): void {
        this.resize.emit({ width, height });
    }

    ngOnDestroy(): void {
        const target = this.el.nativeElement;
        observer.unobserve(target);
        entriesMap.delete(target);
    }
}
