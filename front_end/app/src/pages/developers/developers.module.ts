import { NgModule }                      from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { BrowserModule }                 from '@angular/platform-browser';
import { UpgradeModule }                 from '@angular/upgrade/static';
import { RouterModule, Routes }          from '@angular/router';
import { FormsModule }                   from '@angular/forms';
import { TranslateModule }               from '@ngx-translate/core';
import { AngularSvgIconModule }          from 'angular-svg-icon';

import { ComponentsModule }         from '../../components/components.module';
import { DirectivesModule }         from '../../directives/directives.module';
import { NxAboutModule }            from './about/about.module';
import { MenuModule }               from '../../menu';
import { NxAboutComponent }         from './about/about.component';
import { NxKnowledgeBaseComponent } from './knowledge-base/knowledge-base.component';

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
            },
            {
                path      : 'knowledge-base',
                component : NxKnowledgeBaseComponent,
                children  : [
                    {
                        path      : ':level1',
                        component : NxKnowledgeBaseComponent,
                        children  : [
                            {
                                path      : ':level2',
                                component : NxKnowledgeBaseComponent
                            }
                        ]
                    }
                ]
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
        AngularSvgIconModule.forRoot(),
        RouterModule.forChild(appRoutes),
        MenuModule
    ],
    providers : [],
    declarations : [
        NxKnowledgeBaseComponent
    ],
    bootstrap : [],
    entryComponents : [
        NxAboutComponent,
        NxKnowledgeBaseComponent
    ],
    exports: [
        NxAboutComponent,
        NxKnowledgeBaseComponent
    ]
})
export class NxDevelopersModule {}
