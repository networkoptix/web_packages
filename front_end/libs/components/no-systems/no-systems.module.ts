import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxNoSystemsComponent } from './no-systems.component';

@NgModule({
    imports: [
        TranslateModule
    ],
    declarations: [
        NxNoSystemsComponent
    ],
    providers: [
        NxNoSystemsComponent
    ],
    exports: [
        NxNoSystemsComponent
    ]
})

export class NoSystemsModule {}
