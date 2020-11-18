import { Directive, ElementRef, EventEmitter, Output, OnDestroy, Inject } from '@angular/core';
import ResizeObserver from 'resize-observer-polyfill';
import { WINDOW } from '../services/window-provider';

const entriesMap = new WeakMap();

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
  @Output()
  resize = new EventEmitter();

  constructor(private el: ElementRef,
              @Inject(WINDOW) private window: Window) {
      // @ts-ignore
      if (window.jscd.browser !== 'Microsoft Internet Explorer') {
          const target = this.el.nativeElement;
          entriesMap.set(target, this);
          observer.observe(target);
      }
  }

  _resizeCallback({ contentRect: { width, height } }) {
      this.resize.emit({ width, height });
  }

  ngOnDestroy() {
      // @ts-ignore
      if (window.jscd.browser !== 'Microsoft Internet Explorer') {
          const target = this.el.nativeElement;
          observer.unobserve(target);
          entriesMap.delete(target);
      }
  }
}
