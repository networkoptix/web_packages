import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule }          from '@angular/forms';

import { NxRightMenuComponent } from './right-menu.component';

import { TranslateModule }      from '@ngx-translate/core';
import { ComponentsModule }     from '../../components/components.module';
import { DirectivesModule }     from '../../directives/directives.module';
import { PipesModule } from '../../pipes/pipes.module';

const appRoutes: Routes = [
    {
        path: 'right', component: NxRightMenuComponent,
    }
];

// TODO: Remove it after test

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,
        FormsModule,
        DirectivesModule,
        PipesModule,
        RouterModule.forChild(appRoutes)
    ],
    providers      : [],
    declarations   : [
        NxRightMenuComponent,
    ],
    bootstrap      : [],
    exports        : [
        NxRightMenuComponent
    ]
})
export class RightMenuModule {
}
