import { NgModule }               from '@angular/core';
import { CommonModule }           from '@angular/common';
import { RouterModule, Routes }   from '@angular/router';
import { FormsModule }            from '@angular/forms';
import { NgbModule }              from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }        from '@ngx-translate/core';

import { DirectivesModule }       from '../../../directives/directives.module';
import { ComponentsModule }       from '../../../components/components.module';
import { AuthGuard }              from '../../../routeGuards';
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
        RouterModule.forChild(appRoutes)
    ],
    providers: [
    ],
    declarations: [
        NxSystemsListComponent
    ],
    bootstrap: [
    ],
    exports: [
        NxSystemsListComponent
    ]
})
export class NxSystemsListModule {
}
