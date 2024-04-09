import { Component, forwardRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NxRadioComponent } from '@components/radio/radio.component';

import { BaseFilterItem } from '../base-filter-item.component';

@Component({
    selector: 'nx-radio-filter-item',
    templateUrl: 'radio-filter-item.component.html',
    styleUrls: ['radio-filter-item.component.scss'],
    standalone: true,
    imports: [NxRadioComponent, FormsModule],
    providers: [
        { provide: BaseFilterItem, useExisting: forwardRef(() => NxRadioFilterItemComponent) },
    ],
    // eslint-disable-next-line @angular-eslint/no-host-metadata-property
    host: {
        '[class.selected]': 'isSelected()',
    },
})
export class NxRadioFilterItemComponent<T> extends BaseFilterItem<T> {}
