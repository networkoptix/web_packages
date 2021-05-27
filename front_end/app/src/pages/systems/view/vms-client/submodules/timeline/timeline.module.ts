import { NgModule }             from '@angular/core'
import declarations             from './components'
import export_components        from './components/exports'
import { CommonModule }         from '@angular/common'
import { AngularSvgIconModule } from 'angular-svg-icon';


@NgModule({
  declarations,
  exports: export_components,
  imports: [
    CommonModule,
    AngularSvgIconModule.forRoot()
  ],
  providers: [],
})
export class VmsClientTimelineModule {
}

export default VmsClientTimelineModule;
