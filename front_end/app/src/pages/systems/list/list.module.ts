import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';
import { AuthGuard } from '@src/routeGuards';

import { NxNoSystemsComponent } from '../no-systems/no-systems.component';

import { NxSystemsListComponent } from './list.component';

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
