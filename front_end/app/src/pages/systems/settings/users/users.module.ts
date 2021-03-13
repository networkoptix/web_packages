import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { RouterModule }         from '@angular/router';
import { FormsModule }          from '@angular/forms';
import { NgbModule }            from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }      from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { DirectivesModule }       from '../../../../directives/directives.module';
import { ComponentsModule }       from '../../../../components/components.module';
import { NxSystemUsersComponent } from './users.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        AngularSvgIconModule.forRoot(),
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
