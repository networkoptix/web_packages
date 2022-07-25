import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxEmailComponent } from './email.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
    ],
    declarations: [
        NxEmailComponent
    ],
    providers: [
        NxEmailComponent
    ],
    exports: [
        NxEmailComponent
    ]
})

export class EmailModule {}
