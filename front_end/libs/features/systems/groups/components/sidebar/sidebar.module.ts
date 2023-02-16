import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';

import { NxGroupsSidebarLevelModule } from '../sidebar-level/sidebar-level.module';

import { NxSystemGroupsSidebarComponent } from './sidebar.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        CommonModule,
        ComponentsCoreModule,
        DragDropModule,
        NxGroupsSidebarLevelModule,
        PreLoaderModule,
    ],
    declarations: [NxSystemGroupsSidebarComponent],
    providers: [NxSystemGroupsSidebarComponent],
    exports: [NxSystemGroupsSidebarComponent],
})
export class NxSystemGroupsSidebarModule {}
