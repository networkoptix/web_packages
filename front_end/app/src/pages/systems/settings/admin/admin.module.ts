import { NgModule }                       from '@angular/core';
import { CommonModule }                   from '@angular/common';
import { AngularSvgIconModule }           from 'angular-svg-icon';
import { RouterModule }                   from '@angular/router';
import { FormsModule }                    from '@angular/forms';
import { NgbModule }                      from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }                from '@ngx-translate/core';

import { DirectivesModule }               from '../../../../directives/directives.module';
import { ComponentsModule }               from '../../../../components/components.module';
import { NxSystemAdminComponent }         from './admin.component';
import { NxSystemStandardAdminComponent } from './standard/standard.component';
import { NxSystemAdvancedAdminComponent } from './advanced/advanced.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        AngularSvgIconModule.forRoot()
    ],
    providers: [
    ],
    declarations: [
        NxSystemAdminComponent,
        NxSystemStandardAdminComponent,
        NxSystemAdvancedAdminComponent
    ],
    bootstrap: [
    ],
    exports: [
        NxSystemAdminComponent
    ]
})
export class NxSystemAdminModule {
}
