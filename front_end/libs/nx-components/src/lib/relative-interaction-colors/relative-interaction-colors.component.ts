import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'nx-relative-color-mixins-demo',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './relative-interaction-colors.component.html',
    styleUrl: './relative-interaction-colors.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelativeInteractionsComponent {
    colors = [
        {
            name: 'dark1',
            value: '#060809',
        },
        {
            name: 'dark3',
            value: '#12181C',
        },
        {
            name: 'dark6',
            value: '#253137',
        },
        {
            name: 'dark7',
            value: '#2B3940',
        },
        {
            name: 'dark9',
            value: '#374953',
        },
        {
            name: 'dark11',
            value: '#435A65',
        },
        {
            name: 'dark14',
            value: '#567281',
        },
        {
            name: 'dark15',
            value: '#5C7A8A',
        },
        {
            name: 'light1',
            value: '#FFFFFF',
        },
        {
            name: 'light4',
            value: '#DAE2E7',
        },
        {
            name: 'light12',
            value: '#91A9B6',
        },
        {
            name: 'light10',
            value: '#A3B8C2',
        },
        {
            name: 'light15',
            value: '#7594A3',
        },
        {
            name: 'attention-red',
            value: '#ef5350',
        },
        {
            name: 'attention-green',
            value: '#4CAF50',
        },
        {
            name: 'attention-yellow',
            value: '#FFCA28',
        },
        {
            name: 'additional-pink',
            value: '#EC407A',
        },
        {
            name: 'additional-purple',
            value: '#AB47BC',
        },
        {
            name: 'additional-cyan',
            value: '#26C6DA',
        },
        {
            name: 'additional-orange',
            value: '#FFA726',
        },
        {
            name: 'brand',
            value: '#2FA2DB',
        },
        {
            name: 'Named Color',
            value: 'blueviolet',
        },
        {
            name: '3 digit color',
            value: '#d23',
        },
        {
            name: '8 digit color',
            value: '#ab120099',
        },
        {
            name: 'rgb',
            value: 'rgb(255, 200, 0)',
        },
        {
            name: 'rgba',
            value: 'rgba(128, 255, 0, 0.8)',
        },
        {
            name: 'hsl',
            value: 'hsl(286, 100%, 50%)',
        },
        {
            name: 'hsla',
            value: 'hsla(221, 100%, 50%, 0.3)',
        },
    ];
}
