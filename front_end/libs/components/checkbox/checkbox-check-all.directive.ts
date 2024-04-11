import { Directive, inject } from '@angular/core';

import { NxCheckboxComponent } from './checkbox.component';

/**
 * This is the directive to mark the element as the check all element.
 */
@Directive({
    selector: 'nx-checkbox[checkAll]',
    standalone: true,
})
export class NxCheckAllDirective {
    checkBoxComponent = inject(NxCheckboxComponent);
    ngAfterViewInit(): void {
        this.checkBoxComponent.isCheckAll$.next(true);
    }
}
