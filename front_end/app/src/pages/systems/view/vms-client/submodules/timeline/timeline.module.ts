import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import declarations from './components';
// eslint-disable-next-line camelcase
import export_components from './components/exports';

@NgModule({
    declarations,
    exports: export_components,
    imports: [
        CommonModule,
        AngularSvgIconModule.forRoot()
    ],
    providers: []
})
export class VmsClientTimelineModule {
}

export default VmsClientTimelineModule;
