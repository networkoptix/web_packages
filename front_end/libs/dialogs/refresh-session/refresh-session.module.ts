import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { UpdateWebadminSessionModule } from '@components/update-webadmin-session/update-webadmin-session.module';

import { RefreshSessionModalContent } from './refresh-session.component';

@NgModule({
    imports: [
        CommonModule,
        // FormsModule,
        // AngularSvgIconModule.forRoot(),
        // TranslateModule,

        UpdateWebadminSessionModule,
    ],
    declarations: [
        RefreshSessionModalContent,
    ],
    providers: [],
    exports: [
        RefreshSessionModalContent,
    ]
})
export class RefreshSessionModalModule {}
