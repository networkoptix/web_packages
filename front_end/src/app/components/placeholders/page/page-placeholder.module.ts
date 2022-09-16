import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { FooterModule } from '@components/footer/footer.module';

import { NxPagePlaceholderComponent } from './page-placeholder.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        FooterModule,
    ],
    declarations: [
        NxPagePlaceholderComponent
    ],
    providers: [
        NxPagePlaceholderComponent
    ],
    exports: [
        NxPagePlaceholderComponent
    ]
})

export class PagePlaceHolderModule {}
