import { Component, forwardRef } from '@angular/core';

import { BaseFilterItem } from '../base-filter-item.component';

@Component({
    selector: 'nx-chip-filter-item',
    templateUrl: 'chip-filter-item.component.html',
    styleUrls: ['chip-filter-item.component.scss'],
    standalone: true,
    imports: [],
    providers: [
        { provide: BaseFilterItem, useExisting: forwardRef(() => NxChipFilterItemComponent) },
    ],
    // eslint-disable-next-line @angular-eslint/no-host-metadata-property
    host: {
        '[class.selected]': 'isSelected()',
    },
})
export class NxChipFilterItemComponent<T> extends BaseFilterItem<T> {}
