import { NgModule }              from '@angular/core';
import { CommonModule }          from '@angular/common';
import { NgbModule }             from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }       from '@ngx-translate/core';
import { RouterModule }          from '@angular/router';
import { FormsModule }           from '@angular/forms';
import { AngularSvgIconModule }  from 'angular-svg-icon';

import { ComponentsModule }      from '../../../components/components.module';
import { DirectivesModule }      from '../../../directives/directives.module';
import { NxMenuApiComponent }       from './menu.component';
import { NxLevel1ItemComponent } from './level-1/level-1-item.component';
import { NxLevel3ItemComponent } from './level-3/level-3-item.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        NgbModule,
        DirectivesModule,
        TranslateModule,
        AngularSvgIconModule.forRoot(),
        FormsModule,
        ComponentsModule
    ],
    providers: [
        NxMenuApiComponent,
        NxLevel1ItemComponent,
        NxLevel3ItemComponent
    ],
    declarations: [
        NxMenuApiComponent,
        NxLevel1ItemComponent,
        NxLevel3ItemComponent
    ],
    bootstrap: [],
    exports: [
        NxMenuApiComponent
    ]
})
export class MenuApiModule {
}
