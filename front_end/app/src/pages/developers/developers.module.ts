import { NgModule }                      from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { RouterModule, Routes }          from '@angular/router';
import { FormsModule }                   from '@angular/forms';
import { TranslateModule }               from '@ngx-translate/core';
import { AngularSvgIconModule }          from 'angular-svg-icon';

import { ComponentsModule }         from '../../components/components.module';
import { DirectivesModule }         from '../../directives/directives.module';
import { PipesModule }              from '../../pipes/pipes.module';
import { NxAboutModule }            from './about/about.module';
import { MenuModule }               from '../../menu';
import { NxAboutComponent }         from './about/about.component';
import { NxKnowledgeBaseComponent } from './knowledge-base/knowledge-base.component';
import { NxDevToolsComponent } from './dev-tools/dev-tools.component';
import { DevelopersGuard }          from '../../routeGuards';
import { Nx404Component }           from '../404/404.component';

const appRoutes: Routes = [
    {
        path : '',
        component: Nx404Component
    },
    {
        path      : ':name',
        component : NxAboutComponent,
        canActivate : [DevelopersGuard],
        children  : [
            {
                path      : 'dev-tools',
                component : NxDevToolsComponent,
                children  : [
                    {
                        path      : ':level1',
                        component : NxDevToolsComponent,
                        children  : [
                            {
                                path      : ':level2',
                                component : NxDevToolsComponent
                            }
                        ]
                    }
                ]
            },
            {
                path     : ':kb-name',
                children : [
                    {
                        path      : '',
                        component : NxKnowledgeBaseComponent,
                        pathMatch : 'full'
                    },
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
            },
        ]
    }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        FormsModule,
        PipesModule,
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
    exports: [
        NxAboutComponent,
        NxKnowledgeBaseComponent
    ]
})
export class NxDevelopersModule {}
