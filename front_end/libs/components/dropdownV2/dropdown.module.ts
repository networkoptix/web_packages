import { NgModule } from '@angular/core';

import { NxDropdownComponent } from './dropdown.component';
import { NxSimpleDropdownItemComponent } from './dropdownItems/simpleDropdownItem/simple-dropdown-item.component';

@NgModule({
    imports: [NxDropdownComponent, NxSimpleDropdownItemComponent],
    exports: [NxDropdownComponent, NxSimpleDropdownItemComponent],
})
export class NxDropdownModule {}
