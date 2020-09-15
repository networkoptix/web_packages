import { BrowserModule } from '@angular/platform-browser'
import { NgModule } from '@angular/core'

import components from './components'
import services from './services'


@NgModule({
  declarations: components,
  exports: components,
  imports: [
    BrowserModule,
  ],
  providers: services,
})
export class VmsClientPlaybackModule {
}

export default VmsClientPlaybackModule
