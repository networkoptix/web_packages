import {
    Component,
    Input, SimpleChanges
}                                    from '@angular/core';
import { BaseDropdown }              from '../injDropdown';
import { NxUriService }              from '../../../services/uri.service';
import { NxConfigService }           from '../../../services/nx-config';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { BehaviorSubject }           from 'rxjs';

@Component({
    selector   : 'nx-systems',
    templateUrl: 'systems.component.html',
    styleUrls  : ['systems.component.scss']
})

export class NxSystemsDropdown extends BaseDropdown {
    @Input() endpoint: any;
    @Input() systems: any;
    @Input() activeSystem: any;
    @Input() maxSystemNameSize = 0;
    @Input() rightOffset = 0;

    buttonSize$ = new BehaviorSubject(0);

    systemCounter: number;
    active = {
        health  : false,
        register: false,
        settings: false,
        view    : false
    };

    params: any;
    show: boolean;

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        private uriService: NxUriService
    ) {
        super(languageService, configService);
    }

    trackItem(index, item) {
        return item ? item.id : undefined;
    }

    updateURI(sid) {
        this.show = false;
        let url   = '/systems/' + sid;

        if (this.endpoint.view) {
            url += '/view';
        }

        if (this.endpoint.information) {
            url += '/health/';
        }

        this.uriService
            .updateURI(url)
            .then(() => {
                // TODO: Remove this once we retire "VIEW" from AJS
                if (this.endpoint.view) {
                    window.location.href = url;
                }
            });
    }

    updateButtonSize({ width }) {
        this.buttonSize$.next(width);
    }

    ngOnInit(): void {
        this.systemCounter = this.systems.length;
    }

    ngOnChanges(changes: SimpleChanges) {
        this.endpoint = (changes.endpoint) ? changes.endpoint.currentValue : this.endpoint;
        this.systems = (changes.systems) ? changes.systems.currentValue : this.systems;
        this.activeSystem = (changes.activeSystem) ? changes.activeSystem.currentValue : this.activeSystem;
        this.systemCounter = this.systems.length;
    }
}
