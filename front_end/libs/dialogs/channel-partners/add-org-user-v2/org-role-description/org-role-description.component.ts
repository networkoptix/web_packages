import { CdkStepper } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    ElementRef,
    forwardRef,
    inject,
    Inject,
    input,
    SkipSelf,
    ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LetDirective } from '@ngrx/component';
import { TranslateModule } from '@ngx-translate/core';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { NxControlMessageComponent } from '@components/forms/control-messages/control-message/control-message.component';
import { NxControlMessagesComponent as NxMessagesContainer } from '@components/forms/control-messages/control-messages.component';
import { NxControlMessagesToken } from '@components/forms/control-messages/control-messages.token';
import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';
import { NxTooltipV2Directive } from '@directives/tooltip-v2/tooltip-v2.directive';
import LANG from '@language_static';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { OrgRoleIds } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { DefaultUserGroups } from '@services/system.service/user-manager/default-groups';
import { cleanId } from '@utils/general';

@Component({
    selector: 'nx-org-role-description',
    templateUrl: 'org-role-description.component.html',
    styleUrls: [
        '../../../../components/forms/control-messages/control-message/control-message.component.scss',
        'org-role-description.component.scss',
    ],
    standalone: true,
    imports: [
        CommonModule,
        LetDirective,
        TranslateModule,
        NgxTranslateCutModule,
        NxTooltipV2Directive,
    ],
    host: {
        class: 'nx-control-message--info',
    },
    hostDirectives: [NxThemeAttributeDirective],
    providers: [
        {
            provide: NxControlMessageComponent,
            useExisting: forwardRef(() => NxOrgRoleDescriptionComponent),
        },
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxOrgRoleDescriptionComponent {
    orgLang = LANG.channelPartners.orgs;
    sysAdminId = OrgRoleIds.Admin;

    private orgRoles = inject(NxChannelPartnersService).organizationRoles$$;
    constructor(
        public host: ElementRef<HTMLElement>,
        @SkipSelf() @Inject(NxControlMessagesToken) private messagesContainer: NxMessagesContainer,
        @SkipSelf() stepper: CdkStepper,
    ) {
        stepper.selectionChange.pipe(takeUntilDestroyed()).subscribe(() => {
            this.tooltip?.close();
        });
    }

    key = input.required<string>();

    @ViewChild('tooltip') private tooltip?: NxTooltipV2Directive;

    private selected = computed<boolean>(() => this.messagesContainer.state()?.key === this.key());
    protected _selectedChangeEffect = effect(() => {
        const selected = this.selected();
        if (!selected) {
            this.tooltip?.close();
        }
    });
    private orgRoleIdToUserGroupId = computed<Record<string, string>>(() => {
        const orgRoleIds = this.orgRoles().map(r => r.id);
        return Object.fromEntries(
            DefaultUserGroups.filter(g => orgRoleIds.includes(g.orgRoleId)).map(g => [
                g.orgRoleId,
                cleanId(g.id),
            ]),
        );
    });
    description = computed<string>(() => this.orgLang.orgRoleInfo[this.key()].description);
    tooltipContent = computed<string>(() => {
        const [roleId, orgRoleIdToUserGroupId] = [this.key(), this.orgRoleIdToUserGroupId()];
        if (!(roleId in orgRoleIdToUserGroupId)) {
            return '';
        }
        const groupId = orgRoleIdToUserGroupId[roleId];
        return this.orgLang.defaultUserGroups[groupId];
    });
}
