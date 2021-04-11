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

import { Disposable } from '@theia/core';
import { Path } from '@theia/core';
import { injectable, inject } from 'inversify';
import { ServerProxyRpcClient } from '../common/rpc';
import { ServerProxyRpcServer } from '../common/rpc';
import { ServerProxy, ServerProxyInstanceStatus, StatusId } from '../common/server-proxy';
import { ServerProxyInstanceManager } from './server-proxy-instance-manager';
import { ServerProxyManager } from './server-proxy-manager';

@injectable()
export class ServerProxyRpcServerImpl implements ServerProxyRpcServer {
    client: ServerProxyRpcClient | undefined;

    @inject(ServerProxyInstanceManager)
    private readonly appManager: ServerProxyInstanceManager

    @inject(ServerProxyManager)
    private readonly serverProxyManager: ServerProxyManager

    async getServerProxies(): Promise<ServerProxy[]> {
        return this.serverProxyManager.get().map(c => {
            return {
                id: c.id,
                name: c.name
            }
        });
    }

    async startApp(serverProxyId: string, workspace: string, args?: any): Promise<ServerProxyInstanceStatus> {
        const path = new Path(workspace);

        const instance = (await this.appManager.startApp(serverProxyId, path));

        let disposable: Disposable | undefined = undefined;

        disposable = instance.statusChanged((status: ServerProxyInstanceStatus) => {
            this.client?.fireStatusChanged(status);
            if (status.statusId == StatusId.stopped || status.statusId == StatusId.errored) {
                disposable?.dispose();
            }
        });

        return instance.status;
    }

    async getStatus(id: number): Promise<ServerProxyInstanceStatus | undefined> {
        return this.appManager.getStatus(id);
    }

    stopApp(id: number): Promise<Boolean> {
        return this.appManager.stopApp(id);
    }

    setClient(client: ServerProxyRpcClient | undefined): void {
        this.client = client;
    }

    getClient(): ServerProxyRpcClient | undefined {
        return this.client;
    }

    dispose(): void {
    }
}
