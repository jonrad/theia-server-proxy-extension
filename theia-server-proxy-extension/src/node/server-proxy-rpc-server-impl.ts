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
import { injectable, inject } from 'inversify';
import { ServerProxyRpcClient } from '../common/rpc';
import { ServerProxyRpcServer } from '../common/rpc';
import { ServerProxy, ServerProxyInstanceStatus } from '../common/server-proxy';
import { ServerProxyInstanceManager } from './server-proxy-instance-manager';
import { ServerProxyManager } from './server-proxy-manager';

@injectable()
export class ServerProxyRpcServerImpl implements ServerProxyRpcServer {
    client: ServerProxyRpcClient | undefined;

    @inject(ServerProxyInstanceManager)
    private readonly instanceManager: ServerProxyInstanceManager

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

    async getInstance(serverProxyId: string, context: any): Promise<ServerProxyInstanceStatus | undefined> {
        return (await this.instanceManager.getInstance(serverProxyId, context))?.status;
    }

    async startInstance(serverProxyId: string, context: any): Promise<ServerProxyInstanceStatus> {
        const serverProxy = this.serverProxyManager.getById(serverProxyId);
        if (!serverProxy) {
            throw Error(`Invalid server proxy id ${serverProxyId}`)
        }

        const instance = (await this.instanceManager.startInstance(serverProxy, context));

        let disposable: Disposable | undefined = undefined;

        disposable = instance.statusChanged((status: ServerProxyInstanceStatus) => {
            this.client?.fireStatusChanged(status);
            if (ServerProxyInstanceStatus.isCompleted(status)) {
                disposable?.dispose();
            }
        });

        return instance.status;
    }

    async getInstanceStatus(id: number): Promise<ServerProxyInstanceStatus | undefined> {
        return this.instanceManager.getInstanceStatus(id);
    }

    stopInstance(id: number): Promise<Boolean> {
        return this.instanceManager.stopInstance(id);
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
