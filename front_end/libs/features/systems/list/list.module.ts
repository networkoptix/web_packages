import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { NoSystemsModule } from '@components/no-systems/no-systems.module';
import { ClientButtonModule } from '@components/open-client-button/client-button.module';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';
import { SearchModule } from '@components/search/search.module';
import { NxSystemsListComponent } from '@components/systems-list/list.component';
import { SystemListModule } from '@components/systems-list/list.module';
import { DirectivesModule } from '@directives/directives.module';
import { AuthGuard } from '@guards/authGuard';

const appRoutes: Routes = [
    {
        path: '',
        component: NxSystemsListComponent,
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
        ClientButtonModule,
        DirectivesModule,
        NoSystemsModule,
        PagePlaceHolderModule,
        PipesModule,
        SearchModule,
        SystemListModule,
    ],
    providers: [
    ],
    declarations: [
    ],
    bootstrap: [
    ],
    exports: []
})
export class NxSystemsListModule {
}
