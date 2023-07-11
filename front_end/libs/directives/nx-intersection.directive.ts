import {
    Directive,
    ElementRef,
    EventEmitter,
    Output,
    OnDestroy,
    OnInit,
    Input,
} from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

import { CoercedBoolInput, IBool } from '@decorators/ibool';

import { IntersectionStatus } from './nx-intersection.directive.types';

async function isVisible(element: HTMLElement): Promise<boolean> {
    return new Promise(resolve => {
        const observer = new IntersectionObserver(([entry]) => {
            resolve(entry.isIntersecting);
            observer.disconnect();
        });

        observer.observe(element);
    });
}

function isIntersecting(
    entry: IntersectionObserverEntry,
    config: IntersectionObserverInit,
): boolean {
    // was not tested for multiple thresholds. Just handling the case that it might be an array
    const thresholds = Array.isArray(config.threshold) ? config.threshold : [config.threshold];

    return thresholds.some(
        threshold => entry.isIntersecting || entry.intersectionRatio > threshold,
    );
}

const fromIntersectionObserver = (
    element: HTMLElement,
    config: IntersectionObserverInit,
    debounce = 0,
    emitVisibleOnlyOnce: CoercedBoolInput = false,
): Observable<IntersectionStatus> =>
    new Observable<IntersectionStatus>(subscriber => {
        const subject$ = new Subject<{
            entry: IntersectionObserverEntry;
            observer: IntersectionObserver;
        }>();

        const intersectionObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (isIntersecting(entry, config)) {
                    subject$.next({ entry, observer });
                } else {
                    subject$.next(null);
                }
            });
        }, config);

        subject$.pipe(debounceTime(debounce)).subscribe(async state => {
            const isEntryVisible = state && (await isVisible(state?.entry.target as HTMLElement));

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
                subject$.complete();
            },
        };
    });

// https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
// Use this to detect when an element is visible on the screen
@Directive({
    selector: '[nxOnIntersect]',
    standalone: true,
})
export class NxIntersectionObserver implements OnInit, OnDestroy {
    @Input() intersectionDebounce: number = 0;
    @Input() intersectionRootMargin: string = '0px';
    @Input() intersectionRoot: HTMLElement;
    @Input() intersectionThreshold: number | number[];
    @IBool() @Input() emitVisibleOnlyOnce: CoercedBoolInput = false;

    @Output() nxOnIntersect = new EventEmitter<IntersectionStatus>();

    private destroy$ = new Subject<true>();

    constructor(private element: ElementRef) {}

    ngOnInit(): void {
        const element = this.element.nativeElement;
        const config = {
            root: this.intersectionRoot,
            rootMargin: this.intersectionRootMargin,
            threshold: this.intersectionThreshold,
        };

        fromIntersectionObserver(
            element,
            config,
            this.intersectionDebounce,
            this.emitVisibleOnlyOnce,
        )
            .pipe(takeUntil(this.destroy$))
            .subscribe(status => {
                this.nxOnIntersect.emit(status);
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
    }
}
