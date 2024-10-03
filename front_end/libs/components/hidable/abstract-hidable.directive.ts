import { ContentObserver } from '@angular/cdk/observers';
import {
    booleanAttribute,
    ContentChild,
    ContentChildren,
    Directive,
    ElementRef,
    HostBinding,
    inject,
    Input,
    QueryList,
    signal,
    Signal,
    TemplateRef,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, switchMap, tap } from 'rxjs';

import { NxHidableItemDirective } from './hidable-item.directive';

/**
 * Abstract class to be used by the NxHidableComponent to provide the hidable functionality.
 *
 * This class could be used as a base if we ever wanted to create a version that supports
 * hiding on the y-axis.
 */
@Directive()
export abstract class AbstractHidableDirective {
    protected hidden$$ = signal(false);

    /**
     * Whether the hidable content is currently hidden.
     */
    public isHidden$$ = this.hidden$$ as Signal<boolean>;

    protected hideAllHidableWhenCollapsed$$ = signal(false);

    /**
     * Whether all hidable items should be hidden when the container is collapsed.
     *
     * If set to true, all hidable items will be hidden when the container is collapsed.
     *
     * If set to false, only the items that can't be displayed will be hidden.
     */
    @Input({ transform: booleanAttribute }) protected set hideAllHidable(value: boolean) {
        this.hideAllHidableWhenCollapsed$$.set(value);
    }

    @HostBinding('class.show-hidable-template') protected showHidableTemplate = true;

    @ContentChild('hiddenTemplate') protected hiddenTemplate: TemplateRef<unknown>;

    @ContentChildren(NxHidableItemDirective, { descendants: true })
    protected hidableItems: QueryList<NxHidableItemDirective>;

    protected elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

    protected mutations$ = inject(ContentObserver).observe(this.elementRef.nativeElement);

    protected abstract expand$: Observable<boolean>;

    protected abstract collapse$: Observable<boolean>;

    protected sync$ = toObservable(this.hidden$$).pipe(
        switchMap(hidden => (hidden ? this.expand$ : this.collapse$)),
        takeUntilDestroyed(),
        tap(hidden => this.hidden$$.set(hidden)),
    );

    constructor() {
        this.sync$.subscribe();
    }
}
