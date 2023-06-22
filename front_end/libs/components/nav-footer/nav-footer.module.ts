import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { LanguageModule } from '@components/dropdowns/language/language.module';
import { PipesModule } from '@pipes/pipes.module';

import { NxNavFooterComponent } from './nav-footer.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        LanguageModule,
        PipesModule,
    ],
    declarations: [NxNavFooterComponent],
    providers: [NxNavFooterComponent],
    exports: [NxNavFooterComponent],
})
export class NavFooterModule {}
