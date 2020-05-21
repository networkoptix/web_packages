import { Injectable }      from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class NxRibbonService {
    context = {
        visibility     : false,
        message        : '',
        text           : '',
        url            : '',
        type           : '',
        updateFunction : ''
    };

    contextSubject = new BehaviorSubject(this.context);

    constructor() {
    }

    show(message, text, url, type?, updateFunction?) {
        const msg = (typeof message === 'function') ? message() : message;
        const txt = (typeof text === 'function') ? text() : text;
        this.context = {
            visibility : true,
            message    : msg,
            text       : txt,
            url,
            type,
            updateFunction
        };
        this.contextSubject.next(this.context);
    }

    hide() {
        this.context = {
            visibility     : false,
            message        : '',
            text           : '',
            url            : '',
            type           : '',
            updateFunction : ''
        };
        this.contextSubject.next(this.context);
    }
}
