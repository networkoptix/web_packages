import { NgModule } from '@angular/core';

import { NxBaseTabComponent } from './tab/tab.component';
import { NxTabsComponent } from './tabs.component';

@NgModule({
    imports: [NxTabsComponent, NxBaseTabComponent],
    exports: [NxTabsComponent, NxBaseTabComponent],
})
export class NxTabsModule {}
