import { Injectable }      from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class NxRibbonService {
    context = {
        visibility    : false,
        message       : '',
        text          : '',
        url           : '',
        type          : '',
        updateFunction: ''
    };

    contextSubject = new BehaviorSubject(this.context);

    constructor() {
    }

    show(message, text, url, type?, updateFunction?) {
        this.context = {
            visibility: true,
            message,
            text,
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
