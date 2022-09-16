import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { ComponentsCoreModule } from '@components/components-core.module';
import { ClientButtonModule } from '@components/open-client-button/client-button.module';
import { TagModule } from '@components/tag/tag.module';

import { SystemCardComponent } from './system-card.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
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
