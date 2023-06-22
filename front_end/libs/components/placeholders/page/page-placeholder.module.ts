import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { FooterModule } from '@components/footer/footer.module';
import { PipesModule } from '@pipes/pipes.module';

import { NxPagePlaceholderComponent } from './page-placeholder.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        FooterModule,
        PipesModule,
    ],
    declarations: [NxPagePlaceholderComponent],
    providers: [NxPagePlaceholderComponent],
    exports: [NxPagePlaceholderComponent],
})
export class PagePlaceHolderModule {}
