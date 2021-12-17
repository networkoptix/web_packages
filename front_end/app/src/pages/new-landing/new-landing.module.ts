import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxBackgroundGraphicComponent } from './background-graphic/background-graphic.component';
import { NxContentContainerComponent } from './content-container/content-container';
import { NxIntroTextComponent } from './intro-text/intro-text.component';
import { NxContentLandingBlockComponent } from './landing-content-block/landing-content-block.component';
import { NxLandingPageComponent } from './landing-page.component';
import { NxLearnMoreComponent } from './learn-more/learn-more.component';
import { NxMaskComponent } from './mask/mask.component';

const appRoutes: Routes = [
    {
        path: '',
        component: NxLandingPageComponent
    }
];

@NgModule({
    declarations: [
        NxContentLandingBlockComponent,
        NxLandingPageComponent,
        NxContentContainerComponent,
        NxBackgroundGraphicComponent,
        NxMaskComponent,
        NxLearnMoreComponent,
        NxIntroTextComponent
    ],
    imports: [
        CommonModule,
        DirectivesModule,
        TranslateModule,
        ComponentsModule,
        RouterModule.forChild(appRoutes),
        AngularSvgIconModule.forRoot()
    ],
    exports: []
})
export class NewLandingModule { }
