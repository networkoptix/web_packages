import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { ComponentsModule } from '@components/components.module';
import { NxLayoutViewComponent } from '@components/layout-view/layout-view.component';
import { LayoutViewModule } from '@components/layout-view/layout-view.module';
import { DirectivesModule } from '@directives/directives.module';
import { AuthGuard } from '@guards/authGuard';
import { SystemTitleResolver } from '@resolvers/system-title-resolver';

const appRoutes: Routes = [
    {
        path: '',
        title: SystemTitleResolver,
        component: NxLayoutViewComponent,
        canActivate: [AuthGuard],
    },
    {
        path: ':layoutId',
        title: SystemTitleResolver,
        component: NxLayoutViewComponent,
        canActivate: [AuthGuard],
    },
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
        DragDropModule,
        LayoutViewModule
    ],
    providers: [],
    declarations: [],
    bootstrap: [],
    exports: []
})
export class NxLayoutViewModule {
}
