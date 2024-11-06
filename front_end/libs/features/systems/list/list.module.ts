import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxNoSystemsComponent } from '@components/no-systems/no-systems.component';
import { NxSearchComponent } from '@components/search/search.component';
import { NxSystemsListComponent } from '@components/systems-list/list.component';
import { AuthGuard } from '@guards/authGuard';
import { PipesModule } from '@pipes/pipes.module';

const appRoutes: Routes = [
    {
        path: '',
        component: NxSystemsListComponent,
        canActivate: [AuthGuard],
        data: {
            atBase: true,
            enableRedirect: true,
        },
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
        NxNoSystemsComponent,
        PipesModule,
        NxSearchComponent,
        NxSystemsListComponent,
    ],
    providers: [],
    declarations: [],
    bootstrap: [],
    exports: [],
})
export class NxSystemsListModule {}
