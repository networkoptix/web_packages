import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { DevelopersMenuModule } from '@components/developers-menu/developers-menu.module';
import { SearchModule } from '@components/search/search.module';
import { DirectivesModule } from '@directives/directives.module';
import { DevelopersGuard } from '@guards/developersGuard';
import { PipesModule } from '@app/pipes/pipes.module';

import { Nx404Component } from '../404/404.component';

import { NxAboutComponent } from './about/about.component';
import { NxAboutModule } from './about/about.module';
import { NxDevToolsComponent } from './dev-tools/dev-tools.component';
import { NxKnowledgeBaseComponent } from './knowledge-base/knowledge-base.component';

const appRoutes: Routes = [
    {
        path: '',
        component: Nx404Component,
        canActivate: [DevelopersGuard]
    },
    {
        path: ':name',
        canActivate: [DevelopersGuard],
        children: [
            {
                path: '',
                component: NxAboutComponent,
                pathMatch: 'full'
            },
            {
                path: 'dev-tools',
                component: NxDevToolsComponent,
                children: [
                    {
                        path: ':level1',
                        component: NxDevToolsComponent,
                        children: [
                            {
                                path: ':level2',
                                component: NxDevToolsComponent
                            }
                        ]
                    }
                ]
            },
            {
                path: ':kb-name',
                children: [
                    {
                        path: ':level1',
                        component: NxKnowledgeBaseComponent
                    },
                    {
                        path: '',
                        component: NxKnowledgeBaseComponent,
                        pathMatch: 'full'
                    }
                ]
            }
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
        DevelopersMenuModule,
        SearchModule,
        ContentBlockModule
    ],
    providers: [],
    declarations: [
        NxKnowledgeBaseComponent
    ],
    bootstrap: [],
    exports: [
        NxAboutComponent,
        NxKnowledgeBaseComponent
    ]
})
export class NxDevelopersModule { }
