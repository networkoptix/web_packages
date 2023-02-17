import {
    Component,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import staticLang from '@app/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { NxPartnersService } from '@pages/channel-partners/partners.service';
import { NxApplyService } from '@services/apply.service';
import {
    BrandInfo,
    UserInfo
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

@UntilDestroy()
@Component({
    selector: 'nx-customization-users',
    templateUrl: 'users.component.html',
    styleUrls: ['users.component.scss']
})

export class NxCustomizationUsersComponent implements OnInit, OnDestroy {
    readonly environment = environment;
    LANG = staticLang;

    public currentCustomization: BrandInfo;
    public users: UserInfo[] = [];

    @ViewChild('pageApply', { read: ViewContainerRef, static: true }) private pageApply: ViewContainerRef;

    constructor(
        private applyService: NxApplyService,
        private partnersService: NxPartnersService,
        private dialogService: NxDialogsService,
    ) {}

    ngOnInit(): void {
        this.applyService.initPageFormsWatcher(this.pageApply);

        this.partnersService.usersSubject
            .subscribe(users => {
                this.users = users;
            });
    }

    ngOnDestroy(): void {
        this.applyService.resetFormWatchers();
    }

    addUser(): void {
        this.dialogService.addBrandUser();
    }
}
