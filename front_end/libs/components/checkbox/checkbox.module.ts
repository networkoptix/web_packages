import { NgModule } from '@angular/core';

import { NxCheckAllContainerDirective } from './checkbox-check-all-container.directive';
import { NxCheckAllDirective } from './checkbox-check-all.directive';
import { NxCheckboxComponent } from './checkbox.component';

@NgModule({
    imports: [NxCheckboxComponent, NxCheckAllDirective, NxCheckAllContainerDirective],
    exports: [NxCheckboxComponent, NxCheckAllDirective, NxCheckAllContainerDirective],
})
export class NxCheckboxModule {}
