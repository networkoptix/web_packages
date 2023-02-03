import {
    Directive,
    ElementRef,
    Input
} from '@angular/core';

@Directive({ selector: '[nxRotate]' })
export class NxRotate {
    @Input() set nxRotate(rotation: number) {
        this.#rotation = Math.round(rotation / this.#clampTo) * this.#clampTo;
        this.#updateRotation();
    }

    #rotation = 0;
    #clampTo = 90;

    resizeObserver: ResizeObserver;

    private get changeAspect(): boolean {
        return Boolean(this.#rotation / this.#clampTo % 2);
    }

    #updateRotation = (): void => {
        this.el.nativeElement.style.transform = `rotate(${this.#rotation}deg)`;
    };

    #constrainToParent = ({ width, height }: { width: number; height: number }): void => {
        this.el.nativeElement.style.maxHeight = this.changeAspect ? `${width}px` : '';
        this.el.nativeElement.style.maxWidth = this.changeAspect ? `${height}px` : '';
        if (this.changeAspect) {
            const wider = height > width;
            const scale = (wider ? height / width : width / height) * 100;
            this.el.nativeElement.style[wider ? 'width' : 'height'] = `${scale}%`;
        }
    };

    constructor(
        private el: ElementRef<HTMLElement>
    ) {
        this.resizeObserver = new ResizeObserver(([{ contentRect }]) => {
            this.#constrainToParent(contentRect);
        });
        this.resizeObserver.observe(this.el.nativeElement.parentElement);
    }

    ngOnDestroy(): void {
        this.resizeObserver.disconnect();
    }
}
