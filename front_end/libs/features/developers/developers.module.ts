import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DevelopersGuard } from '@guards/developersGuard';

import { Nx404Component } from '../404/404.component';

import { NxAboutComponent } from './about/about.component';
import { NxAboutModule } from './about/about.module';
import { NxDevToolsComponent } from './dev-tools/dev-tools.component';
import { NxKnowledgeBaseComponent } from './knowledge-base/knowledge-base.component';

const appRoutes: Routes = [
    {
        path: '',
        component: Nx404Component,
        canActivate: [DevelopersGuard],
    },
    {
        path: ':name',
        canActivate: [DevelopersGuard],
        children: [
            {
                path: '',
                component: NxAboutComponent,
                pathMatch: 'full',
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
                                component: NxDevToolsComponent,
                            },
                        ],
                    },
                ],
            },
            {
                path: ':kb-name',
                children: [
                    {
                        path: ':level1',
                        component: NxKnowledgeBaseComponent,
                    },
                    {
                        path: '',
                        component: NxKnowledgeBaseComponent,
                        pathMatch: 'full',
                    },
                ],
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(appRoutes), NxAboutModule, NxKnowledgeBaseComponent],
    providers: [],
    declarations: [],
    bootstrap: [],
    exports: [NxAboutComponent, NxKnowledgeBaseComponent],
})
export class NxDevelopersModule {}
