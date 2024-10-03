import { ContentChild, ContentChildren, Directive, effect, QueryList } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, Subject, switchMap } from 'rxjs';

import { NxCheckAllDirective } from './checkbox-check-all.directive';
import { NxCheckboxComponent } from './checkbox.component';

/**
 * This is the container that controls the check all functionality.
 */
@Directive({
    selector: '[checkAllContainer]',
    exportAs: 'checkAllContainer',
    standalone: true,
})
export class NxCheckAllContainerDirective {
    protected checkAllInstance$ = new Subject<NxCheckboxComponent>();
    protected checkAllInstance$$ = toSignal(this.checkAllInstance$, { initialValue: null });
    protected checkAllToggled$$ = toSignal(
        this.checkAllInstance$.pipe(
            switchMap(ref =>
                ref.lastChange$.pipe(
                    map(update => ({
                        update,
                        value: ref.value,
                    })),
                ),
            ),
        ),
        { initialValue: { update: Date.now(), value: false } },
    );

    @ContentChild(NxCheckAllDirective) set updateCheckAllRef(checkAllRef: NxCheckAllDirective) {
        if (checkAllRef) {
            this.checkAllInstance$.next(checkAllRef.checkBoxComponent);
        }
    }

    protected otherCheckBoxesQuery$ = new Subject<QueryList<NxCheckboxComponent>>();
    public otherCheckBoxInstances$ = this.otherCheckBoxesQuery$.pipe(
        switchMap(ref => ref.changes),
        map(ref =>
            (ref.toArray() as NxCheckboxComponent[]).map(ref =>
                ref.isCheckAll$.pipe(map(checkAll => (!checkAll ? ref : null))),
            ),
        ),
        switchMap(refs => combineLatest(refs)),
        map(refs => refs.filter(Boolean) as NxCheckboxComponent[]),
    );
    public otherCheckBoxesData$ = this.otherCheckBoxInstances$.pipe(
        switchMap(refs =>
            combineLatest(
                refs.map(ref =>
                    combineLatest([ref.data$, ref.lastChange$]).pipe(
                        map(([data, lastUpdate]) => ({ data, lastUpdate, selected: ref.value })),
                    ),
                ),
            ),
        ),
    );
    public otherCheckBoxesData$$ = toSignal(this.otherCheckBoxesData$);
    public otherCheckBoxInstances$$ = toSignal(this.otherCheckBoxInstances$, {
        initialValue: [],
    });

    private otherCheckBoxedToggleState$ = this.otherCheckBoxInstances$.pipe(
        switchMap(refs =>
            combineLatest(refs.map(ref => ref.lastChange$)).pipe(
                map(() => refs.filter(ref => !ref.disabled).map(ref => ref.value)),
            ),
        ),
    );

    public toggledCount$$ = toSignal(
        this.otherCheckBoxedToggleState$.pipe(
            map(ref => ref.filter(Boolean).length),
            startWith(0),
        ),
        { initialValue: 0 },
    );

    protected otherCheckBoxesAllToggled$$ = toSignal(
        this.otherCheckBoxedToggleState$.pipe(map(ref => ref.length > 0 && ref.every(Boolean))),
        { initialValue: false },
    );

    protected otherCheckBoxes$$ = toSignal(this.otherCheckBoxInstances$, { initialValue: [] });

    @ContentChildren(NxCheckboxComponent, { descendants: true }) set updateOtherCheckboxesRef(
        checkAllRef: QueryList<NxCheckboxComponent>,
    ) {
        this.otherCheckBoxesQuery$.next(checkAllRef);
    }

    toggleAllBoxes = (forceUncheckAll?: boolean): void => {
        const allChecked = this.checkAllToggled$$();
        const otherCheckBoxInstances = this.otherCheckBoxInstances$$();

        otherCheckBoxInstances.forEach(ref => {
            if (forceUncheckAll ? ref.value : ref.value !== allChecked.value) {
                ref.changeState();
                ref.notifyChange();
            }
        });
    };

    checkAllToggledEffect = effect(
        () => {
            this.toggleAllBoxes();
        },
        { allowSignalWrites: true },
    );

    otherCheckBoxesToggledEffect = effect(
        () => {
            const otherCheckBoxesAllToggled = this.otherCheckBoxesAllToggled$$();
            const checkAllInstance = this.checkAllInstance$$();

            if (checkAllInstance && otherCheckBoxesAllToggled !== checkAllInstance.value) {
                checkAllInstance.changeState();
            }
        },
        { allowSignalWrites: true },
    );
}
