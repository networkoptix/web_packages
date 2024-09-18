import { booleanAttribute, Directive, ElementRef, inject, input } from '@angular/core';

import { NxApplyActionParentDirective } from './nx-apply-action-classes-parent.directive';
@Directive({
    selector: '[nxActionClassesTarget]',
    standalone: true,
})
export class NxApplyActionTargetDirective {
    nxActionClassesTarget = input(true, { transform: booleanAttribute });
    parent?: NxApplyActionParentDirective;
    elRef = inject(ElementRef);
}
