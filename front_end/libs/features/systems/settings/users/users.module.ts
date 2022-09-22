import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { ComponentsModule } from '@components/components.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxSystemUsersComponent } from './users.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        TranslateModule,
        ComponentsModule,
        PipesModule,
        DirectivesModule,
        AngularSvgIconModule.forRoot(),
        ContentBlockModule
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
