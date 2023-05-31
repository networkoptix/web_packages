import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxMobileHeaderMenuComponent } from './mobile-menu.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule
    ],
    declarations: [
        NxMobileHeaderMenuComponent
    ],
    providers: [
        NxMobileHeaderMenuComponent
    ],
    exports: [
        NxMobileHeaderMenuComponent
    ]
})

export class MobileHeaderMenuModule {}
