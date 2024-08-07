import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxDevelopersMenuComponent } from '@components/developers-menu/developers-menu.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxIntersectionObserver } from '@directives/nx-intersection.directive';
import { NxMatchHeightDirective } from '@directives/nx-match-height.directive';
import { NxProjectedLinkHandler } from '@directives/nx-projected-link-handler.directive';
import { DevelopersGuard } from '@guards/developersGuard';
import { PipesModule } from '@pipes/pipes.module';
import { NxMenuProjectionDirective } from 'nx-components';

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
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        AngularSvgIconModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxDevelopersMenuComponent,
        NxAboutModule,
        PipesModule,
        NxPreLoaderComponent,
        NxSearchComponent,
        NxAddSvgSrcDirective,
        NxIntersectionObserver,
        NxMatchHeightDirective,
        NxProjectedLinkHandler,
        NxMenuProjectionDirective,
    ],
    providers: [],
    declarations: [NxKnowledgeBaseComponent],
    bootstrap: [],
    exports: [NxAboutComponent, NxKnowledgeBaseComponent],
})
export class NxDevelopersModule {}
