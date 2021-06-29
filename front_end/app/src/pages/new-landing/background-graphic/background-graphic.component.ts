import { Component, Input, OnInit } from '@angular/core';
import { NxConfigService, IConfig } from '@services/nx-config';

interface layer {
    scale : number
    path  : string
}

@Component({
    selector    : 'nx-background-graphic',
    templateUrl : './background-graphic.component.html',
    styleUrls   : ['./background-graphic.component.scss']
})
export class NxBackgroundGraphicComponent {
  CONFIG: IConfig;
  @Input() scrollPosition = 0;

  layers: layer[] = [];

  graphicPaths = ['1', '2', '3', '4', '5', '6', '7', 'contrast']

  svgProperties = {
      defaultWidth  : 3840,
      defaultHeight : 2160
  }

  constructor(configService: NxConfigService) {
      this.CONFIG = configService.getConfig();
      for (const graphic of this.graphicPaths) {
          this.layers.push({
              path  : 'land_layer_' + graphic + '.svg',
              scale : 0.5
          });
      }
  }
}
