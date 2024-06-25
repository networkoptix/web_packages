import { NgModule } from '@angular/core';

import { NxButtonToggleGroupComponent } from './button-toggle-group.component';
import { NxButtonToggleComponent } from './button-toggle.component';

@NgModule({
    imports: [NxButtonToggleGroupComponent, NxButtonToggleComponent],
    exports: [NxButtonToggleGroupComponent, NxButtonToggleComponent],
})
export class NxButtonToggleModule {}
