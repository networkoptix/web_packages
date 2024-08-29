import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { selectCurrentParentPartnerForChild } from '@store/channel-partners/channel-partners.selectors';

import { NxInformationViewComponent } from '../information-v2-view/information-v2-view.component';

@Component({
    selector: 'nx-support-v2',
    templateUrl: 'support-v2.component.html',
    styleUrls: ['support-v2.component.scss'],
    standalone: true,
    imports: [NxPreLoaderComponent, NxInformationViewComponent],
    host: {
        '[class.nx-support-v2--loading]': 'loading()',
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxSupportV2Component {
    private store = inject(Store);
    private parentPartner = this.store.selectSignal(selectCurrentParentPartnerForChild);
    loading = computed(() => !this.parentPartner());
    information = computed(() => this.parentPartner()?.supportInformation);
}
