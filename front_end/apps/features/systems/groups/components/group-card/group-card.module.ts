import { NgModule } from '@angular/core';
// import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxGroupCardComponent } from './group-card.component';

@NgModule({
    imports: [
        // AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
    ],
    declarations: [
        NxGroupCardComponent,
    ],
    providers: [
        NxGroupCardComponent,
    ],
    exports: [
        NxGroupCardComponent,
    ]
})
export class NxGroupCardModule {}
