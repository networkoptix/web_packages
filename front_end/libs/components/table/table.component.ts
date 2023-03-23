import { Component, ContentChild, Input, TemplateRef } from '@angular/core';

/* USAGE
 <nx-table [data]='records'></nx-table>

 Optional header and rows can be supplied through ng-template
 .. see sandbox/table
*/

@Component({
    selector: 'nx-table',
    templateUrl: 'table.component.html',
    styleUrls: ['table.component.scss'],
})
export class NxTableComponent {
    @Input() data: Record<string, string | boolean>[];

    @ContentChild('headers') headers: TemplateRef<never>;
    @ContentChild('rows') rows: TemplateRef<never>;
}
