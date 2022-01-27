import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
import { NxSystemsListComponent } from '@components/systems-list/list.component';
import { DirectivesModule } from '@directives/directives.module';
import { AuthGuard } from '@guards/authGuard';
import { PipesModule } from '@src/pipes/pipes.module';
import { NxSystemGroupsListComponent } from './list.component';

const appRoutes: Routes = [
    {
        path: '',
        component: NxSystemsListComponent,
        canActivate: [AuthGuard],
    },
    {
        path: 'groups',
        component: NxSystemGroupsListComponent,
        canActivate: [AuthGuard],
    },
    {
        path: 'groups/:groupId',
        component: NxSystemGroupsListComponent,
        canActivate: [AuthGuard],
    }
];

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        RouterModule.forChild(appRoutes),
        AngularSvgIconModule.forRoot(),
        DragDropModule
    ],
    providers: [
    ],
    declarations: [
        NxSystemGroupsListComponent
    ],
    bootstrap: [
    ],
    exports: [
        NxSystemsListComponent,
        NxSystemGroupsListComponent
    ]
})
export class NxSystemsListModule {
}
