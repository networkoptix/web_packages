import { Component, Input } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-knowledge-base',
    templateUrl : 'knowledge-base.component.html',
    styleUrls   : ['knowledge-base.component.scss']
})
export class NxKnowledgeBaseComponent {
};
