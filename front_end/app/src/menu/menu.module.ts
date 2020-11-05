import { NgModule }              from '@angular/core';
import { CommonModule }          from '@angular/common';
import { BrowserModule }         from '@angular/platform-browser';
import { UpgradeModule }         from '@angular/upgrade/static';
import { NgbModule }             from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }       from '@ngx-translate/core';
import { RouterModule }          from '@angular/router';
import { FormsModule }           from '@angular/forms';
import { AngularSvgIconModule }  from 'angular-svg-icon';

import { NxButtonModule }        from './menu-button/button.module';
import { ComponentsModule }      from '../components/components.module';
import { DirectivesModule }      from '../directives/directives.module';
import { NxMenuComponent }       from './menu.component';
import { NxLevel1ItemComponent } from './level-1/level-1-item.component';
import { NxLevel2ItemComponent } from './level-2/level-2-item.component';
import { NxLevel3ItemComponent } from './level-3/level-3-item.component';
import { NxAlertCounter }        from './alert-counter/alert-counter.component';

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        NgbModule,
        DirectivesModule,
        TranslateModule,
        NxButtonModule,
        AngularSvgIconModule.forRoot(),
        FormsModule,
        ComponentsModule
    ],
    providers: [
        NxMenuComponent,
        NxLevel1ItemComponent,
        NxLevel2ItemComponent,
        NxLevel3ItemComponent,
        NxAlertCounter
    ],
    declarations: [
        NxMenuComponent,
        NxLevel1ItemComponent,
        NxLevel2ItemComponent,
        NxLevel3ItemComponent,
        NxAlertCounter
    ],
    bootstrap: [],
    exports: [
        NxMenuComponent,
        NxLevel1ItemComponent,
        NxLevel2ItemComponent,
        NxLevel3ItemComponent,
        NxAlertCounter
    ]
})
export class MenuModule {
}
