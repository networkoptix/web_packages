import { DragDropModule } from '@angular/cdk/drag-drop';
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

import { NxDashboardComponent } from './dashboard.component';

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
