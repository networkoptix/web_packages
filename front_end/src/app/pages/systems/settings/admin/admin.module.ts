import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
import { AlertBlockModule } from '@components/content-block/alert/block.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ClientButtonModule } from '@components/open-client-button/client-button.module';
import { SectionPlaceholderModule } from '@components/placeholders/section/section-placeholder.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@app/pipes/pipes.module';

import { NxSystemAdminComponent } from './admin.component';
import { NxSystemAdvancedAdminComponent } from './advanced/advanced.component';
import { NxSystemStandardAdminComponent } from './standard/standard.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        AngularSvgIconModule.forRoot(),
        SectionPlaceholderModule,
        AlertBlockModule,
        ClientButtonModule,
        ContentBlockModule
    ],
    providers: [
    ],
    declarations: [
        NxSystemAdminComponent,
        NxSystemStandardAdminComponent,
        NxSystemAdvancedAdminComponent
    ],
    bootstrap: [
    ],
    exports: [
        NxSystemAdminComponent
    ]
})
export class NxSystemAdminModule {
}
