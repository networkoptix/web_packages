import { NgModule } from '@angular/core';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { LayoutStateEffects } from './layout-state.effects';
import { LayoutStateService } from './layout-state.service';
import { ActiveLayoutReducer } from './store/active-layout';
import { ActiveLayoutSync } from './store/active-layout/active-layout.sync';
import { LocalLayoutsReducer, LocalLayoutsSync } from './store/local-layouts';
import { UnsavedLayoutsReducer } from './store/unsaved-layouts';

@NgModule({
    imports: [
        StoreModule.forFeature('localLayouts', LocalLayoutsReducer.reducer),
        StoreModule.forFeature('activeLayout', ActiveLayoutReducer.reducer),
        StoreModule.forFeature('unsavedLayouts', UnsavedLayoutsReducer.reducer),
        EffectsModule.forFeature([LocalLayoutsSync, ActiveLayoutSync, LayoutStateEffects]),
    ],
    providers: [LayoutStateService],
})
export class LayoutStateModule {}
