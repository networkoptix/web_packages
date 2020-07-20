import { NgModule }          from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { BrowserModule }                 from '@angular/platform-browser';
import { UpgradeModule }                 from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule }                   from '@angular/forms';
import { TranslateModule }               from '@ngx-translate/core';
import { ComponentsModule }              from '../../components/components.module';

import { MenuModule }                    from '../../menu';
import { DirectivesModule }             from '../../directives/directives.module';
import { NxAboutModule } from './about/about.module';
import { NxAboutComponent } from './about/about.component';

const appRoutes: Routes = [
    {
        path     : 'developers',
        children : [
            {
                path      : '',
                component : NxAboutComponent
            },
            {
                path      : 'about',
                component : NxAboutComponent
            }
        ]
    }
];

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        FormsModule,
        NxAboutModule,
        RouterModule.forChild(appRoutes),
        MenuModule
    ],
    providers : [],
    declarations : [
    ],
    bootstrap : [],
    entryComponents : [
        NxAboutComponent
    ],
    exports: [
        NxAboutComponent
    ]
})
export class NxDevelopersModule {}
