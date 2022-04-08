import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxAlertCounter } from './alert-counter/alert-counter.component';
import { NxLevel1ItemComponent } from './level-1/level-1-item.component';
import { NxLevel2ItemComponent } from './level-2/level-2-item.component';
import { NxLevel3ItemComponent } from './level-3/level-3-item.component';
import { NxMenuButtonComponent } from './menu-button/button.component';
import { NxMenuComponent } from './menu.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,

        AngularSvgIconModule.forRoot(),
        TranslateModule,

        ComponentsModule,
        DirectivesModule,
        PipesModule,
    ],
    declarations: [
        NxMenuComponent,
        NxLevel1ItemComponent,
        NxLevel2ItemComponent,
        NxLevel3ItemComponent,
        NxAlertCounter,
        NxMenuButtonComponent,
    ],
    bootstrap: [],
    exports: [
        NxMenuComponent,
        NxAlertCounter,
    ]
})
export class MenuModule {
}
