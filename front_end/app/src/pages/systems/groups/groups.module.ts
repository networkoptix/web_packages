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
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxSystemGroupTreeComponent } from './components/system-group-tree/system-group-tree.component';
import { NxSystemGroupPageComponent } from './pages/system-group/system-group-page.component';
import { NxSystemGroupsIndexPageComponent } from './pages/system-groups-index/system-groups-index-page.component';
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
    ],
    providers: [
        CookieService,
        NxSystemGroupsService,
    ],
    declarations: [
        NxSystemGroupTreeComponent,

        NxSystemGroupsIndexPageComponent,
        NxSystemGroupPageComponent
    ],
    bootstrap: [],
    exports: [
        NxSystemGroupsIndexPageComponent,
    ]
})
export class NxSystemGroupsModule {
}
