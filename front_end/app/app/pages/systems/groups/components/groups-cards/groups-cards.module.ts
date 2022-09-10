import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgModule } from '@angular/core';
// import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxGroupCardModule } from '../group-card/group-card.module';
import { NxSystemCardModule } from '../system-card/system-card.module';

import { NxGroupsCardsComponent } from './groups-cards.component';

@NgModule({
    imports: [
        // AngularSvgIconModule.forRoot(),
        DragDropModule,

        ComponentsCoreModule,
        NxGroupCardModule,
        NxSystemCardModule,
    ],
    declarations: [
        NxGroupsCardsComponent,
    ],
    providers: [
        NxGroupsCardsComponent,
    ],
    exports: [
        NxGroupsCardsComponent,
    ]
})
export class NxGroupsCardsModule {}
