import { NgModule }                   from '@angular/core';
import { CommonModule }               from '@angular/common';
import { RouterModule }               from '@angular/router';
import { FormsModule }                from '@angular/forms';
import { AngularSvgIconModule }       from 'angular-svg-icon';
import { NgbModule }                  from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }            from '@ngx-translate/core';

import { DirectivesModule }           from '@directives/directives.module';
import { ComponentsModule }           from '@components/components.module';
import { NxAccountSettingsComponent } from './settings.component';
import { PipesModule } from '@src/pipes/pipes.module';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        AngularSvgIconModule.forRoot()
    ],
    providers: [],
    declarations: [
        NxAccountSettingsComponent
    ],
    bootstrap: [],
    exports: [
        NxAccountSettingsComponent
    ]
})
export class NxAccountSettingsModule {
}
