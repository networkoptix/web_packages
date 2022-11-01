import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxFooterComponent } from './footer.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
    ],
    declarations: [
        NxFooterComponent
    ],
    providers: [
        NxFooterComponent
    ],
    exports: [
        NxFooterComponent
    ]
})

export class FooterModule {}
