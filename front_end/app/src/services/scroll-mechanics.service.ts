import { Injectable }      from '@angular/core';
import { NxConfigService } from './nx-config';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxScrollMechanicsService {
    CONFIG: any;
    windowSizeSubject = new BehaviorSubject({});
    windowScrollSubject = new BehaviorSubject(0);
    elementTableWidthSubject = new BehaviorSubject(0);
    elementViewWidthSubject = new BehaviorSubject(0);
    offsetSubject = new BehaviorSubject(undefined);

    public static SCROLL_OFFSET: number = 48 + 16; // header + padding

    constructor(
            private config: NxConfigService,
    ) {

        this.CONFIG = this.config.getConfig();
    }

    setOffset(height: number) {
        this.offsetSubject.next(height);
    }

    setElementTableWidth(width: number) {
        this.elementTableWidthSubject.next(width);
    }

    setElementViewWidth(width: number) {
        this.elementViewWidthSubject.next(width);
    }

    setWindowSize(height, width) {
        this.windowSizeSubject.next({ height, width });
    }

    setWindowScroll(value) {
        this.windowScrollSubject.next(value);
    }

    getElementOffset(el) {
        const rect = el.getBoundingClientRect();

        return rect.top + window.pageYOffset;
    }
}
