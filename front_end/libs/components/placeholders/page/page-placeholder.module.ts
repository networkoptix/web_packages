import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxFooterComponent } from '@components/footer/footer.component';
import { PipesModule } from '@pipes/pipes.module';

import { NxPagePlaceholderComponent } from './page-placeholder.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        NxFooterComponent,
        PipesModule,
    ],
    declarations: [NxPagePlaceholderComponent],
    providers: [NxPagePlaceholderComponent],
    exports: [NxPagePlaceholderComponent],
})
export class PagePlaceHolderModule {}
