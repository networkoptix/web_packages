import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ComponentsModule } from '../../../../../../components/components.module';

import components from './components';
import services from './services';

@NgModule({
    declarations: components,
    exports: components,
    imports: [
        CommonModule,
        ComponentsModule
    ],
    providers: [] // services,
})
export class VmsClientPlaybackModule {
}

export default VmsClientPlaybackModule;
