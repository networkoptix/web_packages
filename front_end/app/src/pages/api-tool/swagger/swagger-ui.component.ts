import { Component, OnInit } from '@angular/core';

import SwaggerUI from 'swagger-ui';

@Component({
    selector    : 'swagger-ui',
    templateUrl : 'swagger-ui.component.html',
    styleUrls   : []
})
export class SwaggerUiComponent implements OnInit {

    ngOnInit(): void {
        SwaggerUI({
            dom_id          : '#swagger-ui',
            url             : '/static/openapi_v1.json',
        });
        // const ui = SwaggerUI({
        //     dom_id          : '#swagger-ui',
        //     layout          : 'BaseLayout',
        //     presets         : [
        //         SwaggerUI.presets.apis,
        //         SwaggerUI.SwaggerUIStandalonePreset
        //     ],
        //     url             : '/static/openapi_v1.json',
        //     docExpansion    : 'none',
        //     operationsSorter: 'alpha'
        // });
    }
}
