import { NgModule } from '@angular/core'

import export_services from './services/exports'
import declarations from './components'
import export_components from './components/exports'
import { CommonModule } from '@angular/common'


@NgModule({
  declarations,
  exports: export_components,
  imports: [
    CommonModule,
  ],
  providers: export_services
})
export class VmsClientTimelineModule {
}

export default VmsClientTimelineModule
