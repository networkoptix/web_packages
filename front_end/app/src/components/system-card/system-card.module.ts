import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
// import { SharedComponentsModule } from '@components/shared-components.module';
import { ClientButtonModule } from '@components/open-client-button/client-button.module';
import { TagModule } from '@components/tag/tag.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { SystemCardComponent } from './system-card.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        // SharedComponentsModule,
        ClientButtonModule,
        TagModule,
        PipesModule,
    ],
    declarations: [
        SystemCardComponent,
    ],
    providers: [
        SystemCardComponent,
    ],
    exports: [
        SystemCardComponent,
    ]
})
export class SystemCardModule {}
