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
import { NxApiLevel1ItemComponent } from './level-1/level-1-item.component';
import { NxApiLevel2ItemComponent } from './level-2/level-2-item.component';
import { NxApiLevel3ItemComponent } from './level-3/level-3-item.component';
import { PipesModule } from '@src/pipes/pipes.module';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        NgbModule,
        DirectivesModule,
        TranslateModule,
        AngularSvgIconModule.forRoot(),
        FormsModule,
        PipesModule,
        ComponentsModule
    ],
    providers: [
        NxMenuApiComponent
    ],
    declarations: [
        NxMenuApiComponent,
        NxApiLevel1ItemComponent,
        NxApiLevel2ItemComponent,
        NxApiLevel3ItemComponent
    ],
    bootstrap : [],
    exports   : [
        NxMenuApiComponent
    ]
})
export class MenuApiModule {
}
