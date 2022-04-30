import { Component, Input, ViewChild, ViewEncapsulation } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';

@Component({
    selector: 'nx-swagger-markdown',
    templateUrl: './swagger-api-information.component.html',
    styleUrls: ['./swagger-api-information.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxSwaggerAPIInformationComponent {
    @ViewChild('markdownRef') markdown: MarkdownComponent;
    @Input() data = '';

    modifyElements(): void {
        if (this.markdown) {
            this.modifyTable();
        }
    }

    modifyTable(): void {
        const table = this.markdown.element.nativeElement.querySelector('table');
        if (table) {
            table.innerHTML = '<thead><tr><th>It was</th><th>It Is</th></tr></thead>' + table.innerHTML;
            const cells = table.querySelectorAll('tbody td');
            for (const cell of cells) {
                const APIFunctions = cell.innerHTML.split('<br>');
                const newHTML = APIFunctions.map(item => {
                    let APIFunction = item.replace(/\s+/g, ''); // Trim whitespace
                    const type = APIFunction.startsWith('~~') ? 'deprecated' : 'new';
                    let symbolClass = 'addition';
                    if (type === 'deprecated') {
                        APIFunction = APIFunction.slice(3, APIFunction.length - 2);
                        symbolClass = 'removal';
                    }
                    const routeSymbol = `<span class=${symbolClass}><span></span><span></span></span>`;
                    return '<code>' + routeSymbol + APIFunction + '</code>';
                });
                cell.innerHTML = newHTML.join('<br>');
            }
        }
    }

    ngAfterViewInit(): void {
        this.modifyElements();
    }
}
