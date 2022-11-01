import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { HeaderLevelOneModule } from './header-level-one/header-level-one.module';
import { HeaderLevelTwoModule } from './header-level-two/header-level-two.module';
import { HeaderMobileModule } from './mobile/mobile.module';
import { NxNewHeaderComponent } from './new-header.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
        HeaderLevelOneModule,
        HeaderLevelTwoModule,
        HeaderMobileModule,
    ],
    declarations: [
        NxNewHeaderComponent,
    ],
    providers: [
        NxNewHeaderComponent
    ],
    exports: [
        NxNewHeaderComponent
    ]
})

export class NewHeaderModule {}
