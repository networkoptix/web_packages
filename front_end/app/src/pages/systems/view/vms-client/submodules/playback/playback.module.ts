import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentsModule } from '../../../../../../components/components.module';

import components from './components';

@NgModule({
    declarations: components,
    exports: components,
    imports: [
        CommonModule,
        ComponentsModule,
        TranslateModule
    ],
    providers: [] // services,
})
export class VmsClientPlaybackModule {
}

export default VmsClientPlaybackModule;
