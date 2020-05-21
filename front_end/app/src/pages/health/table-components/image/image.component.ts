import {
    Component, EventEmitter,
    Input, OnChanges, Output,
    OnDestroy, SimpleChanges
}                          from '@angular/core';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-health-image',
    templateUrl : './image.component.html',
    styleUrls   : ['./image.component.scss']
})
export class NxImageComponent implements OnChanges, OnDestroy {
    @Input() isPrimary: boolean;
    @Input() state: string;
    @Input() time: string;
    @Input() url: string;
    @Input() lightBackground = false;
    @Input() motionPreview = false
    @Input() preloader = false;
    @Input() aspect: string = 'Auto';
    @Output() loaded = new EventEmitter<boolean>();
    show: boolean

    constructor() {
        this.show = false;
        this.loaded.asObservable().subscribe(value => { this.show = value || !this.preloader; });
    }

    ngOnChanges(changes: SimpleChanges) {
        const firstChange = Object.values(changes).reduce((noChanges, { firstChange }) => noChanges && firstChange, true);
        if (!firstChange) {
            this.show = false;
        }
        if (this.state !== 'Online' && this.state !== 'Recording' && this.state !== 'Scheduled') {
            this.url = '';
            this.loaded.emit(true);
        }
    }

    ngOnDestroy() {}
}
