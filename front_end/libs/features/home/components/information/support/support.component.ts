import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { selectCurrentParentPartnerForChild } from '@store/channel-partners/channel-partners.selectors';

import { NxInformationViewComponent } from '../information-view/information-view.component';

@Component({
    selector: 'nx-support',
    templateUrl: 'support.component.html',
    styleUrls: ['support.component.scss'],
    standalone: true,
    imports: [NxPreLoaderComponent, NxInformationViewComponent],
    host: {
        '[class.nx-support--loading]': 'loading()',
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxSupportComponent {
    private store = inject(Store);
    private parentPartner = this.store.selectSignal(selectCurrentParentPartnerForChild);
    loading = computed(() => !this.parentPartner());
    information = computed(() => this.parentPartner()?.supportInformation);
}
