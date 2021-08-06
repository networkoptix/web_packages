import { NgModule }                      from '@angular/core';
import { CdkTableModule }                from '@angular/cdk/table';
import { CommonModule }                  from '@angular/common';
import { RouterModule, Routes }          from '@angular/router';
import { FormsModule }                   from '@angular/forms';
import { TranslateModule }               from '@ngx-translate/core';
import { AngularSvgIconModule }          from 'angular-svg-icon';
import { NgbModule }                     from '@ng-bootstrap/ng-bootstrap';

import { ComponentsModule }              from '../../components/components.module';
import { DirectivesModule }              from '../../directives/directives.module';
import { PipesModule }                   from '../../pipes/pipes.module';
import { MenuModule }                    from '../../menu';
import { ApplyGuard, DevelopersGuard }   from '../../routeGuards';
import { NxDevConsoleComponent }         from './console/console.component';
import { NxDevConsoleMenuComponent }     from './console/menu/console-menu.component';
import { NxDevConsoleTableComponent }    from './console/table/console-table.component';
import { NxDevConsoleEditComponent }     from './console/edit/console-edit.component';

const appRoutes: Routes = [
    {
        path      : '',
        component : NxDevConsoleComponent,
        pathMatch : 'full'
    },
    {
        path      : ':section',
        pathMatch : 'full',
        component : NxDevConsoleComponent
    },
    {
        path      : ':section/:mode',
        pathMatch : 'full',
        component : NxDevConsoleComponent
    },
    {
        path      : ':section/:mode/:id',
        pathMatch : 'full',
        component : NxDevConsoleComponent
    },
    {
        path          : ':section/:mode/:id/:context',
        pathMatch     : 'full',
        canDeactivate : [ApplyGuard],
        component     : NxDevConsoleComponent
    }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        NgbModule,
        DirectivesModule,
        FormsModule,
        PipesModule,
        CdkTableModule,
        AngularSvgIconModule.forRoot(),
        RouterModule.forChild(appRoutes),
        MenuModule
    ],
    providers    : [],
    declarations : [
        NxDevConsoleComponent,
        NxDevConsoleMenuComponent,
        NxDevConsoleTableComponent,
        NxDevConsoleEditComponent
    ],
    bootstrap : [],
    exports   : []
})
export class NxDeveloperConsoleModule {}
