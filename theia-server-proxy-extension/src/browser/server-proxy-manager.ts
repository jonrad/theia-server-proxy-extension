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
import { Path } from '@theia/core';
import { ServerProxyApp } from './server-proxy-app';

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

    public startApp(serverProxy: ServerProxy, path: Path): ServerProxyApp {
        return new ServerProxyApp(
            this.serverProxyRpcServer,
            serverProxy,
            path
        );
    }
}
