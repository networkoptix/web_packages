import { effect, inject, Signal } from '@angular/core';

import { Translatable } from '@pipes/nx-translate.types';
import { NxHeaderService } from '@services/nx-header.service';
import { icons } from '@static-variables';

import type { RibbonAction, RibbonContext } from './ribbon.types';

export abstract class BaseRibbonComponent {
    public headerService = inject(NxHeaderService);
    protected abstract ribbonContext$$: Signal<RibbonContext | undefined>;
    message: Translatable = '';
    actions: RibbonAction[] = [];
    visibility: boolean = false;
    type?: string;
    updateFunction?: () => void;
    icons = icons;

    updateContextEffect = effect(() => {
        const context = this.ribbonContext$$() || {
            visibility: false,
            message: '',
            actions: [],
            updateFunction: undefined,
        };

        this.visibility = context.visibility;
        this.message = context.message;
        this.actions = context.actions;
        this.type = context.type;
        this.updateFunction = context.updateFunction;
    });
}
