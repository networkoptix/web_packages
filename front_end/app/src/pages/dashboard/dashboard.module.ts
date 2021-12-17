import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { DragDropModule }       from '@angular/cdk/drag-drop';
import { FormsModule }          from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }      from '@ngx-translate/core';
import { NgbModule }            from '@ng-bootstrap/ng-bootstrap';

import { DirectivesModule }     from '@directives/directives.module';
import { PipesModule }          from '@src/pipes/pipes.module';
import { ComponentsModule }     from '@components/components.module';
import { NxDashboardComponent } from './dashboard.component';
import { AngularSvgIconModule } from 'angular-svg-icon';

const appRoutes: Routes = [
    { path: '', component: NxDashboardComponent }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        FormsModule,
        NgbModule,
        AngularSvgIconModule.forRoot(),
        RouterModule.forChild(appRoutes),
        DragDropModule
    ],
    providers: [],
    declarations: [
        NxDashboardComponent
    ],
    bootstrap: [],
    exports: []
})
export class NxDashboardModule {
}
