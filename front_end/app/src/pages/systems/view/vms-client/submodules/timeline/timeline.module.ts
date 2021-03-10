import { NgModule } from '@angular/core'
import declarations from './components'
import export_components from './components/exports'
import { CommonModule } from '@angular/common'


@NgModule({
  declarations,
  exports: export_components,
  imports: [
    CommonModule,
  ],
  providers: [],
})
export class VmsClientTimelineModule {
}

export default VmsClientTimelineModule
