import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { TagModule } from '@components/tag/tag.module';

import { NxSystemCardComponent } from './system-card.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        TagModule,
    ],
    declarations: [
        NxSystemCardComponent,
    ],
    providers: [
        NxSystemCardComponent,
    ],
    exports: [
        NxSystemCardComponent,
    ]
})
export class NxSystemCardModule {}
