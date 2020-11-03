import { BrowserModule } from '@angular/platform-browser'
import { NgModule } from '@angular/core'

import export_services from './services/exports'
import declarations from './components'
import export_components from './components/exports'


@NgModule({
  declarations,
  exports: export_components,
  imports: [
    BrowserModule,
  ],
  providers: export_services
})
export class VmsClientTimelineModule {
}

export default VmsClientTimelineModule
