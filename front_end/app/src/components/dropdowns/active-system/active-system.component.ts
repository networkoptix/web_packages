import { Component, Input, SimpleChanges } from '@angular/core';
import { Location }                        from '@angular/common';
import { NxConfigService }                 from '../../../services/nx-config';
import { BaseDropdown }                    from '../injDropdown';
import { NxLanguageProviderService }       from '../../../services/nx-language-provider';


@Component({
    selector: 'nx-active-system',
    templateUrl: 'active-system.component.html',
    styleUrls: ['active-system.component.scss']
})

export class NxActiveSystemDropdown extends BaseDropdown{
    @Input() activeSystem: any;

    active = {
        health: false,
        settings: false,
        view: false,
    };
    canViewInfo: boolean;
    params: any;

    constructor(private languageService: NxLanguageProviderService,
                private configService: NxConfigService,
                private location: Location,
    ) {
        super(languageService, configService);
    }

    private isActive(val) {
        return (this.location.path().indexOf(val) >= 0);
    }

    private updateActive() {
        this.active.health = this.isActive('/health');
        this.active.view = this.isActive('/view');
        this.active.settings = !(this.active.view || this.active.health);
        this.show = false;
    }

    ngOnInit(): void {
        this.updateActive();
    }

    ngOnDestroy() {
    }

    ngOnChanges(changes: SimpleChanges) {
        this.updateActive();
        if (changes.activeSystem) {
            if (!('id' in changes.activeSystem.currentValue)) {
                this.activeSystem = {id: '0'}; // Avoid JS timing error (in console)
            } else if (changes.activeSystem.currentValue.id !== '0') {
                this.canViewInfo = this.CONFIG.accessRoles.adminAccess
                    .includes(changes.activeSystem.currentValue.accessRole.toLowerCase());
            }
        }
    }
}
