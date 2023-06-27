import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { NxConsoleTableComponent } from '@components/console-table/console-table.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';
import { DirectivesModule } from '@directives/directives.module';
import { ApplyGuard } from '@guards/applyGuard';

import { NxDevConsoleComponent } from './console/console.component';
import { NxDevConsoleEditComponent } from './console/edit/console-edit.component';
import { NxDevConsoleMenuComponent } from './console/menu/console-menu.component';

const appRoutes: Routes = [
    {
        path: '',
        component: NxDevConsoleComponent,
        pathMatch: 'full',
    },
    {
        path: ':section',
        pathMatch: 'full',
        component: NxDevConsoleComponent,
    },
    {
        path: ':section/:mode',
        pathMatch: 'full',
        component: NxDevConsoleComponent,
    },
    {
        path: ':section/:mode/:id',
        pathMatch: 'full',
        component: NxDevConsoleComponent,
    },
    {
        path: ':section/:mode/:id/:context',
        pathMatch: 'full',
        canDeactivate: [ApplyGuard],
        component: NxDevConsoleComponent,
    },
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        AngularSvgIconModule,
        NxConsoleTableComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        DirectivesModule,
        PipesModule,
        PreLoaderModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    providers: [],
    declarations: [NxDevConsoleComponent, NxDevConsoleMenuComponent, NxDevConsoleEditComponent],
    bootstrap: [],
    exports: [],
})
export class NxDeveloperConsoleModule {}
