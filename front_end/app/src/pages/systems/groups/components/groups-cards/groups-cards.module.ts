import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgModule } from '@angular/core';
// import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SystemCardModule } from '@components/system-card/system-card.module';

import { NxGroupCardModule } from '../group-card/group-card.module';

import { NxGroupsCardsComponent } from './groups-cards.component';

@NgModule({
    imports: [
        // AngularSvgIconModule.forRoot(),
        DragDropModule,

        ComponentsCoreModule,
        SystemCardModule,
        NxGroupCardModule,
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
