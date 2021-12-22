import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxSystemUsersComponent } from './users.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        PipesModule,
        DirectivesModule,
        AngularSvgIconModule.forRoot()
    ],
    providers: [
    ],
    declarations: [
        NxSystemUsersComponent
    ],
    bootstrap: [
    ],
    exports: [
        NxSystemUsersComponent
    ]
})
export class NxSystemUsersModule {
}
