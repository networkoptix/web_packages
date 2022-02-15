/* In-house specific utility functions. */

import type { MenuNode } from '@services/menus.service.types';
import type {
    NxSystemServer,
    NxMediaServer,
} from '@services/system.service/system-types';

/**
 * Pass a function that evaluates a menu node to fulfill a specific condition,
 * findMenuNode will traverse an array of menuNodes and try to find a node that fulfills the conditionalFunction
 */
export function findMenuNode(
    nodes: MenuNode[],
    conditionalFunction: (node: MenuNode) => boolean
): MenuNode {
    let foundNode: MenuNode = null;
    const findNode = (node: MenuNode) => {
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

export function setServerIpAndPort<T extends NxSystemServer | NxMediaServer>(
    server: T
): T {
    const ipv4Addresses: string[] = [];
    const ipv6Addresses: string[] = [];
    server.networkAddresses.split(';').forEach(addr => {
        if (addr.startsWith('[')) {
            ipv6Addresses.push(addr);
        } else if (addr) {
            ipv4Addresses.push(addr);
        }
    });

    if (ipv4Addresses.length > 0) {
        const [ip, port] = ipv4Addresses[0].split(':');
        server.ip = ip;
        server.port = port || '';
    } else if (ipv6Addresses.length > 0) {
        if (ipv6Addresses[0].startsWith('[')) {
            const [ip, port] = ipv6Addresses[0].split(']:');
            server.ip = ip.substring(1);
            server.port = port || '';
        } else {
            server.ip = ipv6Addresses[0];
            server.port = '';
        }
    } else {
        server.ip = 'N/A';
        server.port = '';
    }

    return server;
}
