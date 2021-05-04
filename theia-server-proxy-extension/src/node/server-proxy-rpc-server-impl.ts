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
import { ServerProxy, ServerProxyInstanceStatus, ServerProxyInstance as ServerProxyInstanceDto } from '../common/server-proxy';
import { ServerProxyInstanceManager } from './server-proxy-instance-manager';
import { ServerProxyInstance } from './server-proxy-instance';
import { ServerProxyManager } from './server-proxy-manager';

@injectable()
export class ServerProxyRpcServerImpl implements ServerProxyRpcServer {
    clients: ServerProxyRpcClient[] = [];

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

    async getInstanceById(instanceId: string): Promise<ServerProxyInstanceDto | undefined> {
        const instance = this.instanceManager.getInstanceById(instanceId);
        if (!instance) {
            return;
        }

        return this.toDto(instance);
    }

    async getInstance(serverProxyId: string, context: string): Promise<ServerProxyInstanceDto | undefined> {
        const instance = await this.instanceManager.getInstance(serverProxyId, context);
        if (!instance) {
            return undefined;
        }

        return this.toDto(instance);
    }

    async getInstances(): Promise<ServerProxyInstanceDto[]> {
        return (await this.instanceManager.getInstances()).map(instance => this.toDto(instance));
    }

    async startInstance(serverProxyId: string, context: string): Promise<ServerProxyInstanceDto> {
        const serverProxy = this.serverProxyManager.getById(serverProxyId);
        if (!serverProxy) {
            throw Error(`Invalid server proxy id ${serverProxyId}`)
        }

        const instance = (await this.instanceManager.startInstance(serverProxy, JSON.parse(context)));

        let disposable: Disposable | undefined = undefined;

        disposable = instance.statusChanged((status: ServerProxyInstanceStatus) => {
            this.clients.forEach(c => c.fireStatusChanged(status));
            if (ServerProxyInstanceStatus.isCompleted(status)) {
                disposable?.dispose();
            }
        });

        this.clients.forEach(c => c.fireStatusChanged(instance.status));

        return this.toDto(instance);
    }

    async getInstanceStatus(id: string): Promise<ServerProxyInstanceStatus | undefined> {
        return this.instanceManager.getInstanceStatus(id);
    }

    stopInstance(id: string): Promise<Boolean> {
        return this.instanceManager.stopInstance(id);
    }

    private toDto(instance: ServerProxyInstance): ServerProxyInstanceDto {
        return {
            id: instance.id,
            serverProxyId: instance.serverProxyId,
            port: instance.port,
            context: JSON.stringify(instance.context),
            lastStatus: instance.status
        };
    }

    setClient(client: ServerProxyRpcClient | undefined): void {
        if (!client) {
            return;
        }

        this.clients.push(client);
    }

    unsetClient(client: ServerProxyRpcClient): void {
        const index = this.clients.indexOf(client);
        if (index < 0) {
            return;
        }

        this.clients.splice(index, 1);
    }

    getClient(): ServerProxyRpcClient | undefined {
        return undefined;
    }

    dispose(): void {
    }
}
