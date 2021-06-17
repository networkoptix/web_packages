import { NgModule }               from '@angular/core';
import { CommonModule }           from '@angular/common';
import { RouterModule, Routes }   from '@angular/router';
import { FormsModule }            from '@angular/forms';
import { NgbModule }              from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }        from '@ngx-translate/core';
import { AngularSvgIconModule }   from 'angular-svg-icon';

import { DirectivesModule }       from '../../../directives/directives.module';
import { ComponentsModule }       from '../../../components/components.module';
import { AuthGuard }              from '../../../routeGuards';
import { NxSystemsListComponent } from './list.component';
import { NxNoSystemsComponent }   from '../no-systems/no-systems.component';
import { PipesModule } from '@src/pipes/pipes.module';

const appRoutes: Routes = [
    {
        path: '', component: NxSystemsListComponent, canActivate: [AuthGuard]
    }
];

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        RouterModule.forChild(appRoutes),
        AngularSvgIconModule.forRoot()
    ],
    providers: [
    ],
    declarations: [
        NxSystemsListComponent,
        NxNoSystemsComponent
    ],
    bootstrap: [
    ],
    exports: [
        NxSystemsListComponent,
        NxNoSystemsComponent
    ]
})
export class NxSystemsListModule {
}
