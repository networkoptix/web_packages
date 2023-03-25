import { Component, ContentChild, EventEmitter, Input, Output, TemplateRef } from '@angular/core';

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
    @Input() data: Record<string, string | boolean | Record<string, string>[]>[];
    @Output() onRowExpand = new EventEmitter<string>();

    @ContentChild('headers') headers: TemplateRef<never>;
    @ContentChild('rows') rows: TemplateRef<never>;

    expand: boolean = false;

    onRowClick(event: MouseEvent): void {
        this.onRowExpand.emit((event.target as HTMLTableElement).id);
    }
}
