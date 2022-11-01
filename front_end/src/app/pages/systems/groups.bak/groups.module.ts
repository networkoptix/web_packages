import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { CookieService } from 'ngx-cookie-service';

import { ComponentsModule } from '@components/components.module';
import { ClientButtonModule } from '@components/open-client-button/client-button.module';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@app/pipes/pipes.module';

import { NxGroupListDumbComponent } from './components/group-list-dumb/group-list-dumb.component';
import { NxSystemGroupTreeComponent } from './components/system-group-tree/system-group-tree.component';
import { NxSystemListDumbComponent } from './components/system-list-dumb/system-list-dumb.component';
import { NxSystemGroupPageComponent } from './pages/system-group/system-group-page.component';
import { NxSystemGroupsIndexPageComponent } from './pages/system-groups-index/system-groups-index-page.component';
import { NxSystemGroupsPageComponent } from './pages/system-groups/system-groups-page.component';
import { routes } from './routes';
import { NxSystemGroupsService } from './services/system-groups.service';
import { groupsReducer } from './store/groups/groups.reducer';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        RouterModule.forChild(routes),
        FormsModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        AngularSvgIconModule.forRoot(),
        DragDropModule,
        StoreModule.forFeature('groups', groupsReducer),
        PagePlaceHolderModule,
        ClientButtonModule
    ],
    providers: [
        CookieService,
        NxSystemGroupsService,
    ],
    declarations: [
        NxSystemGroupTreeComponent,
        NxSystemListDumbComponent,
        NxGroupListDumbComponent,

        NxSystemGroupsPageComponent,
        NxSystemGroupsIndexPageComponent,
        NxSystemGroupPageComponent
    ],
    bootstrap: [],
    exports: [
        NxSystemGroupsPageComponent,
    ]
})
export class NxSystemGroupsModule {
}
