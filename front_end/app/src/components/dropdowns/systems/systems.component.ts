import {
    Component,
    Input, SimpleChanges
}                                    from '@angular/core';
import { BaseDropdown }              from '../injDropdown';
import {
    NxLanguageProviderService,
    NxConfigService, NxUriService
}                                    from '../../../services';

@Component({
    selector   : 'nx-systems',
    templateUrl: 'systems.component.html',
    styleUrls  : ['systems.component.scss']
})

export class NxSystemsDropdown extends BaseDropdown {
    @Input() endpoint;
    @Input() systems;
    @Input() activeSystem;

    systemCounter: number;
    active = {
        health  : false,
        register: false,
        settings: false,
        view    : false
    };

    params;
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
