import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxGroupsSidebarLevelComponent } from './sidebar-level.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        DragDropModule,
    ],
    declarations: [
        NxGroupsSidebarLevelComponent,
    ],
    providers: [
        NxGroupsSidebarLevelComponent,
    ],
    exports: [
        NxGroupsSidebarLevelComponent,
    ]
})
export class NxGroupsSidebarLevelModule {}
