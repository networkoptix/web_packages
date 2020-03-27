import { Component, EventEmitter, Input, OnChanges, Output, OnDestroy, SimpleChanges, SimpleChange } from '@angular/core';
import { Subscription } from 'rxjs';

@Component({
    selector : 'nx-health-image',
    templateUrl : './image.component.html',
    styleUrls : ['./image.component.scss']
})
export class NxImageComponent implements OnChanges, OnDestroy {
    @Input() isPrimary: boolean;
    @Input() state: string;
    @Input() time: string;
    @Input() url: string;
    @Input() lightBackground = false;
    @Input() preloader = false;
    @Output() loaded = new EventEmitter<boolean>();
    loadedSubscription: Subscription;
    urlSubscription: Subscription;
    show: boolean

    constructor() {
        this.show = false;
        this.loadedSubscription = this.loaded.asObservable().subscribe(value => { this.show = value || !this.preloader; });
    }

    ngOnChanges(changes: SimpleChanges) {
        const firstChange = Object.values(changes).reduce((noChanges, { firstChange }) => noChanges && firstChange, true);
        if (!firstChange) {
            this.show = false;
        }
        if (this.state !== 'Online' && this.state !== 'Recording') {
            this.url = '';
            this.loaded.emit(true);
        }
    }

    ngOnDestroy() {
        this.loadedSubscription.unsubscribe();
    }
}
