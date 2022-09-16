import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { UpdateWebadminSessionComponent } from './update-webadmin-session.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        ProcessCancelButtonModule,
        ProcessButtonModule,
    ],
    declarations: [
        UpdateWebadminSessionComponent
    ],
    providers: [
        UpdateWebadminSessionComponent
    ],
    exports: [
        UpdateWebadminSessionComponent
    ]
})

export class UpdateWebadminSessionModule {}
