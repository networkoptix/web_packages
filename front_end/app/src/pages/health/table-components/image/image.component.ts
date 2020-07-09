import { Component, EventEmitter, Input, OnChanges, Output, OnDestroy, SimpleChanges, SimpleChange } from '@angular/core';
import { Subscription } from 'rxjs';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';

@AutoUnsubscribe()
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
    @Input() motionPreview = false
    @Input() preloader = false;
    @Input() aspect: string = 'Auto';
    @Output() loaded = new EventEmitter<boolean>();
    show: boolean

    get imageClass() {
        return this.motionPreview
            ? {
                'motion-preview' : true,
                'd-none'         : !this.show
            } : {
                mini                       : !this.isPrimary,
                'd-none'                   : !this.show,
                'light-thumbnail-preview'  : this.lightBackground,
                'thumbnail-preview'        : !this.lightBackground,
                'image-unavailable-border' : this.state !== 'Online' &&
                                        this.state !== 'Recording' &&
                                        this.state !== 'Scheduled' &&
                                        !this.url,
                wide: this.aspect === '16:9' ||
                    this.aspect === 'Auto',
                normal : this.aspect === '4:3',
                square : this.aspect === '1:1',
                fill   : this.aspect === 'override'
            };
    }

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
