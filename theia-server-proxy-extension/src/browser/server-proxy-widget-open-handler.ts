/********************************************************************************
 * Copyright (C) 2021 Jon Radchenko and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { injectable, inject } from 'inversify';
import { WidgetOpenHandler, WidgetOpenerOptions } from '@theia/core/lib/browser';
import { ServerProxyWidget } from './server-proxy-widget';
import URI from '@theia/core/lib/common/uri';
import { ServerProxyWidgetContext } from './server-proxy-widget-context';
import { ServerProxyManager } from './server-proxy-manager';
import { ServerProxyRpcServer } from '../common/rpc';

@injectable()
export class ServerProxyWidgetOpenHandler extends WidgetOpenHandler<ServerProxyWidget> {
    // TODO 1 move
    public static readonly uriScheme: string = "server-proxy"

    readonly id = ServerProxyWidget.ID;

    @inject(ServerProxyManager)
    protected readonly serverProxyManager: ServerProxyManager;

    @inject(ServerProxyRpcServer)
    protected readonly serverProxyRpcServer: ServerProxyRpcServer;

    async canHandle(uri: URI, options?: WidgetOpenerOptions): Promise<number> {
        if (uri.scheme != ServerProxyWidgetOpenHandler.uriScheme) {
            return 0;
        }

        if (!this.serverProxyManager.getServerProxyById(uri.authority)) {
            return 0;
        }

        // TODO 2 is this possible?
        if (!uri.path) {
            return 0;
        }

        return 100;
    }

    protected createWidgetOptions(uri: URI, options?: WidgetOpenerOptions): ServerProxyWidgetContext {
        const serverProxyId = uri.authority;
        const path = uri.path.toString();

        const serverProxy = this.serverProxyManager.getServerProxyById(serverProxyId);

        if (!serverProxy) {
            throw Error(`Unknown server proxy id: ${serverProxyId}`);
        }

        return {
            serverProxy,
            path
        }
    }
}
