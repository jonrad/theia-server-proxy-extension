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

import { injectable, inject, postConstruct } from 'inversify';
import { ServerProxyRpcServer } from '../common/rpc';
import { ServerProxy } from '../common/server-proxy';
import { ServerProxyWidgetContext } from './server-proxy-widget-context';
import { buildUri } from './server-proxy-uri';
import { Path } from '@theia/core';

@injectable()
export class ServerProxyManager {
    @inject(ServerProxyRpcServer)
    private readonly serverProxyRpcServer: ServerProxyRpcServer;

    private readonly serverProxiesById: Map<string, ServerProxy> = new Map<string, ServerProxy>();

    @postConstruct()
    async init(): Promise<void> {
        // TODO 1 do we know get by id doesn't run before the init is complete?
        (await this.serverProxyRpcServer.getServerProxies())
            .forEach(w => this.serverProxiesById.set(w.id, w));
    }

    public getServerProxyById(serverProxyId: string): ServerProxy | undefined {
        return this.serverProxiesById.get(serverProxyId);
    }

    public startApp(serverProxyId: string, path: Path): ServerProxyWidgetContext {
        const serverProxy = this.getServerProxyById(serverProxyId);
        if (!serverProxy) {
            throw new Error(`No such server proxy ${serverProxyId}`);
        }

        const workspace = path.toString();
        const promise = this.serverProxyRpcServer.startApp(serverProxyId, workspace);
        const uri = buildUri(serverProxyId, path);

        return new ServerProxyWidgetContext(
            uri.toString(),
            serverProxy,
            workspace,
            promise,
            (id: number) => this.serverProxyRpcServer.stopApp(id)
        );
    }
}
