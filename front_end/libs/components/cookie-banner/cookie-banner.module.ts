import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { NxCookieBannerComponent } from './cookie-banner.component';

@NgModule({
    imports: [CommonModule, TranslateModule, NgxTranslateCutModule, AngularSvgIconModule],
    declarations: [NxCookieBannerComponent],
    providers: [NxCookieBannerComponent],
    exports: [NxCookieBannerComponent],
})
export class CookieBannerModule {}
