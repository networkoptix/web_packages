import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxLayoutViewComponent } from '@components/layout-view/layout-view.component';
import { LayoutViewModule } from '@components/layout-view/layout-view.module';
import { AuthGuard } from '@guards/authGuard';
import { PipesModule } from '@pipes/pipes.module';
import { SystemTitleResolver } from '@resolvers/system-title-resolver';

const appRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'default',
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
        FormsModule,
        RouterModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        AngularSvgIconModule,
        DragDropModule,
        PipesModule,
        LayoutViewModule,
    ],
    providers: [],
    declarations: [],
    bootstrap: [],
    exports: [],
})
export class NxLayoutViewModule {}
