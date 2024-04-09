import { Component, forwardRef } from '@angular/core';

import { NxCheckboxComponent } from '../../../checkbox/checkbox.component';
import { BaseFilterItem } from '../base-filter-item.component';

@Component({
    selector: 'nx-checkbox-filter-item',
    templateUrl: 'checkbox-filter-item.component.html',
    styleUrls: ['checkbox-filter-item.component.scss'],
    standalone: true,
    imports: [NxCheckboxComponent],
    providers: [
        { provide: BaseFilterItem, useExisting: forwardRef(() => NxCheckboxFilterItemComponent) },
    ],
    // eslint-disable-next-line @angular-eslint/no-host-metadata-property
    host: {
        '[class.selected]': 'isSelected()',
    },
})
export class NxCheckboxFilterItemComponent<T> extends BaseFilterItem<T> {}
