import { NgModule } from '@angular/core';

import { NxDropdownComponent } from './dropdown.component';
import { NxMultiSelectDropdownItemComponent } from './dropdownItems/multiSelectDropdownItem/multi-select-dropdown-item.component';
import { NxSimpleDropdownItemComponent } from './dropdownItems/simpleDropdownItem/simple-dropdown-item.component';
import { NxMultiDropdownComponent } from './multi-dropdown.component';

@NgModule({
    imports: [
        NxDropdownComponent,
        NxMultiDropdownComponent,
        NxSimpleDropdownItemComponent,
        NxMultiSelectDropdownItemComponent,
    ],
    exports: [
        NxDropdownComponent,
        NxMultiDropdownComponent,
        NxSimpleDropdownItemComponent,
        NxMultiSelectDropdownItemComponent,
    ],
})
export class NxDropdownModule {}
