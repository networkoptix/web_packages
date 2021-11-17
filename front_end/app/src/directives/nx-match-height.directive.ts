import {
    AfterViewInit,
    Directive,
    ElementRef,
    Input,
    OnDestroy
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

// Allows you to make all children with a certain class of the parent component have the same height dyamically
// Attach to parent, and then specify a class to look for in the children with classToMatch input.
// ATM, this directive doesnt work if new cards are added after the initial load, can possibly be added.
@UntilDestroy()
@Directive({
    selector: '[nxMatchHeight]'
})
export class NxMatchHeightDirective implements AfterViewInit, OnDestroy {
  @Input()
  classToMatch: string;

  initialLoadInterval: ReturnType<typeof setInterval>

  resizeObservable$ = fromEvent(window, 'resize')

  constructor(private el: ElementRef) {
      this.resizeObservable$.pipe(untilDestroyed(this), debounceTime(160)).subscribe(() => {
          this.matchHeight(this.el.nativeElement, this.classToMatch);
      });
  }

  ngAfterViewInit() {
      const initialHeight = this.el.nativeElement.getElementsByClassName(this.classToMatch)[0].getBoundingClientRect().height;
      let iterations = 0;
      this.initialLoadInterval = setInterval(() => {
          iterations++;
          if (this.initialHeightDiffers(this.el.nativeElement, this.classToMatch, initialHeight)) {
              this.matchHeight(this.el.nativeElement, this.classToMatch);
              clearInterval(this.initialLoadInterval);
              return;
          }
          if (iterations >= 30) {
              clearInterval(this.initialLoadInterval);
          }
      }, 100);
  }

  // Gets called periodically by SetInterval until a height difference is detected
  initialHeightDiffers(parent: HTMLElement, className: string, initialHeight: number) {
      const children = parent.getElementsByClassName(className);
      Array.from(children).forEach((child: HTMLElement) => {
          child.style.height = 'initial';
      });

      for (const child of Array.from(children)) {
          if (child.getBoundingClientRect().height !== initialHeight) {
              return true;
          }
      }

      return false;
  }

  // Iterates through all the children with the target class and sets their height to the height of the largest one.
  matchHeight(parent: HTMLElement, className: string) {
      if (!parent) return;

      const children = parent.getElementsByClassName(className);
      if (!children) return;

      // Resets the height style so that the heights have to recalculate.
      Array.from(children).forEach((child: HTMLElement) => {
          child.style.height = 'initial';
      });

      let maxHeight = 0;

      Array.from(children).forEach((child: HTMLElement) => {
          maxHeight = Math.max(maxHeight, child.getBoundingClientRect().height);
      });

      Array.from(children).forEach((child: HTMLElement) => { child.style.height = `${maxHeight}px`; });
  };

  ngOnDestroy() {
      clearInterval(this.initialLoadInterval);
  }
}
