import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'nx-add-servers',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['add-servers.component.scss'],
    templateUrl: 'add-servers.component.html',
    imports: [CommonModule, FormsModule],
})
export class AddServersComponent {
    siteId = signal<string | null>(null);
    deploymentCode = signal<string>('');

    route = inject(ActivatedRoute);
    constructor() {
        this.siteId.set(this.route.snapshot.queryParamMap.get('siteId'));
    }
}
