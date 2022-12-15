/* In-house specific utility functions. */

import type { MenuNode } from '@services/menus.service.types';
import type { ec2MediaServer } from '@services/system-api.types';

/**
 * Pass a function that evaluates a menu node to fulfill a specific condition,
 * findMenuNode will traverse an array of menuNodes and try to find a node that fulfills the conditionalFunction
 */
export function findMenuNode(
    nodes: MenuNode[],
    conditionalFunction: (node: MenuNode) => boolean
): MenuNode {
    let foundNode: MenuNode = null;
    const findNode = (node: MenuNode): void => {
        if (conditionalFunction(node)) {
            foundNode = node;
            return;
        }
        for (const childNode of node.nodes) {
            findNode(childNode);
        }
    };
    for (const rootNode of nodes) {
        if (!foundNode) {
            findNode(rootNode);
        }
    }
    return foundNode;
}

export function setServerIpAndPort(
    server: ec2MediaServer
): ec2MediaServer & { ip: string; port: string } {
    const ipv4Addresses: string[] = []; // [fe80::e58b:1151:3859:a75a%2]:7001
    const ipv6Addresses: string[] = []; // 192.168.5.1:7001
    server.networkAddresses.split(';').forEach(addr => {
        if (addr.startsWith('[')) {
            ipv6Addresses.push(addr);
        } else if (addr) {
            ipv4Addresses.push(addr);
        }
    });

    let ip: string;
    let port: string;
    if (ipv4Addresses.length) {
        [ip, port] = ipv4Addresses[0].split(':');
    } else if (ipv6Addresses.length) {
        [ip, port] = ipv6Addresses[0].slice(1).split(']:');
    } else {
        ip = 'N/A';
        port = '';
    }

    return { ...server, ip, port };
}
