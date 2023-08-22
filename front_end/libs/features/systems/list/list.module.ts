import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxNoSystemsComponent } from '@components/no-systems/no-systems.component';
import { NxClientButtonComponent } from '@components/open-client-button/client-button.component';
import { NxPagePlaceholderComponent } from '@components/placeholders/page/page-placeholder.component';
import { NxSearchComponent } from '@components/search/search.component';
import { NxSystemsListComponent } from '@components/systems-list/list.component';
import { DirectivesModule } from '@directives/directives.module';
import { AuthGuard } from '@guards/authGuard';
import { PipesModule } from '@pipes/pipes.module';

const appRoutes: Routes = [
    {
        path: '',
        component: NxSystemsListComponent,
        canActivate: [AuthGuard],
        data: {
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
        NxClientButtonComponent,
        DirectivesModule,
        NxNoSystemsComponent,
        NxPagePlaceholderComponent,
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
