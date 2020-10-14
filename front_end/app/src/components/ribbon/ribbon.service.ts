import { Injectable }      from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { RibbonAction }      from './ribbon.component';
import { NxAppStateService } from '../../services/nx-app-state.service';

export interface RibbonActionInput extends Omit<RibbonAction, 'text'>{
    text: string | Function;
}

@Injectable()
export class NxRibbonService {
    context = {
        visibility     : false,
        message        : '',
        actions        : [],
        type           : '',
        updateFunction : ''
    };

    contextSubject = new BehaviorSubject(this.context);

    constructor(
        private appStateService: NxAppStateService
    ) {
    }

    show(message, actions: RibbonActionInput[], type?, updateFunction?) {
        actions.forEach(action => {
            if (action.type === 'link') {
                action.text = (typeof action.text === 'function') ? action.text() : action.text;
            }
        });
        const msg = (typeof message === 'function') ? message() : message;

        this.context = {
            visibility : true,
            message    : msg,
            actions,
            type,
            updateFunction
        };
        this.contextSubject.next(this.context);
        this.appStateService.ribbonVisibility = true;
    }

    hide() {
        this.context = {
            visibility     : false,
            message        : '',
            actions        : [],
            type           : '',
            updateFunction : ''
        };
        this.contextSubject.next(this.context);
        this.appStateService.ribbonVisibility = false;
    }
}
