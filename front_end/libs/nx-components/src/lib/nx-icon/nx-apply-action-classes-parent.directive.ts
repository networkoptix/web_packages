import {
    ContentChildren,
    Directive,
    HostListener,
    QueryList,
    booleanAttribute,
    computed,
    effect,
    input,
    signal,
} from '@angular/core';

import { NxApplyActionTargetDirective } from './nx-apply-action-classes-target.directive';
@Directive({
    selector: '[nxActionClassesParent], [nxActionClassesParentInherit], nx-action-classes-parent',
    standalone: true,
})
export class NxApplyActionParentDirective {
    // Bind Hover
    hover = signal(false);
    @HostListener('mouseenter') onMouseEnter(): void {
        this.hover.set(true);
    }
    @HostListener('mouseleave') onMouseLeave(): void {
        this.hover.set(false);
        this.active.set(false);
    }

    nxActionClassesParent = input(false, { transform: booleanAttribute });
    nxActionClassesParentInherit = input(false, { transform: booleanAttribute });

    // Bind Focus
    focus = signal(false);
    @HostListener('focus') onFocus(): void {
        this.focus.set(true);
    }
    @HostListener('blur') onBlur(): void {
        this.focus.set(false);
    }

    // Bind Active
    active = signal(false);
    @HostListener('mousedown') onMouseDown(): void {
        this.active.set(true);
    }
    @HostListener('mouseup') onMouseUp(): void {
        this.active.set(false);
    }

    // Current classes

    classes = computed(() => ({
        nxHovered: this.hover(),
        nxFocused: this.focus(),
        nxActive: this.active(),
    }));

    // Propagate classes to children

    actionClassTargets = signal([] as NxApplyActionTargetDirective[]);

    @ContentChildren(NxApplyActionTargetDirective, {
        descendants: true,
    })
    set actionClassTargetsQuerySetter(query: QueryList<NxApplyActionTargetDirective>) {
        this.actionClassTargets.set(query.toArray());
    }

    bindToChildren = effect(cleanup => {
        const children = this.actionClassTargets();
        const cleanupFunctions = children.map(child => {
            const previousParent = child.parent;
            child.parent = this;
            return () => {
                child.parent = previousParent;
            };
        });
        return cleanup(() => cleanupFunctions.forEach(fn => fn()));
    });

    propagateClasses = effect(cleanup => {
        const classes = this.classes();
        // const nxActionClassesParentInherit = this.nxActionClassesParentInherit();
        const elements = this.actionClassTargets().map(
            target => target.elRef.nativeElement as HTMLElement,
        );
        elements.forEach(element => {
            Object.entries(classes).forEach(([className, value]) => {
                console.info({ className, value, element });
                if (value) {
                    element.classList.add(className);
                } else {
                    element.classList.remove(className);
                }
            });
        });
        return cleanup(() => {
            elements.forEach(el => {
                Object.keys(classes).forEach(className => el.classList.remove(className));
            });
        });
    });
}
