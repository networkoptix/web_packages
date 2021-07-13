import { AfterViewInit, Directive, ElementRef, Input, OnDestroy } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

// Attaches to the children, navigates to find the parent, and then finds all children with the classToMatch class and matches their heights.
@UntilDestroy()
@Directive({
    selector: '[nxMatchHeight]'
})
export class NxMatchHeightDirective implements AfterViewInit {
  @Input() classToMatch: string;
  @Input() parentToMatch: string;
  @Input() shouldExectute: boolean;
  parentEl: HTMLElement

  resizeObservable$ = fromEvent(window, 'resize')

  constructor(private el: ElementRef) {
  }

  ngAfterViewInit() {
      // You want shouldExecute to be true on the very last child element, the one that renders last. That way the heights have been calculcated by the dom and the component can properly initialize.
      if (this.shouldExectute) {
          this.parentEl = this.el.nativeElement.closest('.' + this.parentToMatch);
          this.matchHeight(this.parentEl, this.classToMatch);
          this.resizeObservable$.pipe(untilDestroyed(this), debounceTime(100)).subscribe(() => {
              this.matchHeight(this.parentEl, this.classToMatch);
          });
      }
  }

  // Iterates through all the children with the target class and sets their height to the height of the largest one.
  matchHeight(parent: HTMLElement, className: string) {
      if (!parent) return;

      const children = parent.getElementsByClassName(className);
      if (!children) return;

      // Resets the height style so that the heights have to recalculate.
      Array.from(children).forEach((child: any) => {
          child.style.height = 'initial';
      });

      let maxHeight = 0;

      Array.from(children).forEach((child: any) => {
          maxHeight = Math.max(maxHeight, child.getBoundingClientRect().height);
      });

      Array.from(children).forEach((child: any) => { child.style.height = `${maxHeight}px`; });
  };
}
