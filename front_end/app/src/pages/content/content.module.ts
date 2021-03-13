import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }      from '@ngx-translate/core';


import { ComponentsModule }     from '../../components/components.module';
import { DirectivesModule }     from '../../directives/directives.module';
import { NxLandingComponent }   from '../landing/landing.component';
import { NxContentComponent }   from './content.component';

const appRoutes: Routes = [
    { path: '', component: NxContentComponent },
    { path: ':article_param', component: NxContentComponent },
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        RouterModule.forChild(appRoutes)
    ],
    providers    : [],
    declarations : [
        NxContentComponent
    ],
    bootstrap      : [],
    exports        : [
        NxContentComponent
    ]
})
export class ContentModule {
}
