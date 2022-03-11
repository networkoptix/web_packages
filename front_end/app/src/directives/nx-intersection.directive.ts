import {
    Directive,
    ElementRef,
    EventEmitter,
    Output,
    OnDestroy,
    OnInit,
    Input
} from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { takeUntil, debounceTime, startWith } from 'rxjs/operators';

export enum IntersectionStatus {
    Visible = 'Visible',
    Pending = 'Pending',
    NotVisible = 'NotVisible'
}

async function isVisible(element: HTMLElement) {
    return new Promise(resolve => {
        const observer = new IntersectionObserver(([entry]) => {
            resolve(entry.isIntersecting);
            observer.disconnect();
        });

        observer.observe(element);
    });
}

function isIntersecting(entry: IntersectionObserverEntry) {
    return entry.isIntersecting || entry.intersectionRatio > 0;
}

export const fromIntersectionObserver = (
    element: HTMLElement,
    config: IntersectionObserverInit,
    debounce = 0,
    emitVisibleOnlyOnce = false
) =>
    new Observable<IntersectionStatus>(subscriber => {
        const subject$ = new Subject<{
      entry: IntersectionObserverEntry;
      observer: IntersectionObserver;
    }>();

        const intersectionObserver = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach(entry => {
                    if (isIntersecting(entry)) {
                        subject$.next({ entry, observer });
                    } else {
                        subject$.next(null);
                    }
                });
            },
            config
        );

        subject$
            .pipe(
                debounceTime(debounce)
            )
            .subscribe(async state => {
                const isEntryVisible = state && await isVisible(state?.entry.target as HTMLElement);

                if (isEntryVisible) {
                    subscriber.next(IntersectionStatus.Visible);
                    if (emitVisibleOnlyOnce) {
                        subscriber.complete();
                    }
                } else {
                    subscriber.next(IntersectionStatus.NotVisible);
                }
            });

        intersectionObserver.observe(element);

        return {
            unsubscribe() {
                intersectionObserver.disconnect();
                subject$.unsubscribe();
            }
        };
    });

// https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
// Use this to detect when an element is visible on the screen
@Directive({
    selector: '[nxOnIntersect]'
})
export class NxIntersectionObserver implements OnInit, OnDestroy {
  @Input() intersectionDebounce = 0;
  @Input() intersectionRootMargin = '0px';
  @Input() intersectionRoot: HTMLElement;
  @Input() intersectionThreshold: number | number[];
  @Input() emitVisibleOnlyOnce = false;

  @Output() nxOnIntersect = new EventEmitter<IntersectionStatus>();

  private destroy$ = new Subject();

  constructor(private element: ElementRef) {}

  ngOnInit() {
      const element = this.element.nativeElement;
      const config = {
          root: this.intersectionRoot,
          rootMargin: this.intersectionRootMargin,
          threshold: this.intersectionThreshold
      };

      fromIntersectionObserver(
          element,
          config,
          this.intersectionDebounce,
          this.emitVisibleOnlyOnce
      ).pipe(
          startWith(IntersectionStatus.NotVisible),
          takeUntil(this.destroy$)
      ).subscribe(status => {
          this.nxOnIntersect.emit(status);
      });
  }

  ngOnDestroy() {
      this.destroy$.next();
  }
}
