import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
import { ConsoleTableModule } from '@components/console-table/console-table.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { DirectivesModule } from '@directives/directives.module';
import { ApplyGuard } from '@guards/applyGuard';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxDevConsoleComponent } from './console/console.component';
import { NxDevConsoleEditComponent } from './console/edit/console-edit.component';
import { NxDevConsoleMenuComponent } from './console/menu/console-menu.component';

const appRoutes: Routes = [
    {
        path: '',
        component: NxDevConsoleComponent,
        pathMatch: 'full'
    },
    {
        path: ':section',
        pathMatch: 'full',
        component: NxDevConsoleComponent
    },
    {
        path: ':section/:mode',
        pathMatch: 'full',
        component: NxDevConsoleComponent
    },
    {
        path: ':section/:mode/:id',
        pathMatch: 'full',
        component: NxDevConsoleComponent
    },
    {
        path: ':section/:mode/:id/:context',
        pathMatch: 'full',
        canDeactivate: [ApplyGuard],
        component: NxDevConsoleComponent
    }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        FormsModule,
        PipesModule,
        ConsoleTableModule,
        AngularSvgIconModule.forRoot(),
        RouterModule.forChild(appRoutes),
        ContentBlockModule
    ],
    providers: [],
    declarations: [
        NxDevConsoleComponent,
        NxDevConsoleMenuComponent,
        NxDevConsoleEditComponent
    ],
    bootstrap: [],
    exports: []
})
export class NxDeveloperConsoleModule { }
