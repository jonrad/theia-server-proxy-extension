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
import { ServerProxyRpcClient, ServerProxyRpcServer } from '../common/rpc';
import { ServerProxy, ServerProxyInstanceStatus } from '../common/server-proxy';
import { Disposable, Emitter, Event } from '@theia/core';
import { ServerProxyInstance } from './server-proxy-instance';

@injectable()
export class ServerProxyInstanceManager implements Disposable {
    private readonly disposable: Disposable;

    private readonly instancesById: Map<number, { instance: ServerProxyInstance, instanceEmitter: Emitter<ServerProxyInstanceStatus> }> =
        new Map<number, { instance: ServerProxyInstance, instanceEmitter: Emitter<ServerProxyInstanceStatus> }>();

    public readonly updated: Event<ServerProxyInstance>;
    private readonly updatedEmitter: Emitter<ServerProxyInstance>;

    constructor(
        @inject(ServerProxyRpcServer) private readonly serverProxyRpcServer: ServerProxyRpcServer,
        @inject(ServerProxyRpcClient) private readonly serverProxyRpcClient: ServerProxyRpcClient
    ) {
        this.updatedEmitter = new Emitter<ServerProxyInstance>();
        this.updated = this.updatedEmitter.event;

        this.disposable = this.serverProxyRpcClient.statusChanged(status => {
            const maybeInstance = this.instancesById.get(status.instanceId);
            if (!maybeInstance) {
                return;
            }

            const { instance, instanceEmitter } = maybeInstance;
            if (instance.status.timeMs > status.timeMs) {
                return;
            }

            instanceEmitter.fire(status);

            if (ServerProxyInstanceStatus.isCompleted(status)) {
                this.instancesById.delete(status.instanceId);
            }

            this.updatedEmitter.fire(instance);
        });
    }

    private async buildServerProxyInstance(serverProxy: ServerProxy, context: any, instanceStatus: ServerProxyInstanceStatus): Promise<ServerProxyInstance> {
        const instanceId = instanceStatus.instanceId;

        const instanceEmitter = new Emitter<ServerProxyInstanceStatus>();

        const instance = new ServerProxyInstance(
            instanceStatus,
            serverProxy,
            context,
            this.serverProxyRpcServer,
            instanceEmitter.event
        );

        // At this point, the status checker will be able to refresh our new instance
        this.instancesById.set(instanceStatus.instanceId, { instance, instanceEmitter });
        this.updatedEmitter.fire(instance);

        // The status may have updated before we added it to the dictionary. So let's verify we have the latest
        const latestStatus = await this.serverProxyRpcServer.getInstanceStatus(
            instanceId
        )

        if (!latestStatus) {
            // Server lost our instance somehow (eg it crashed)
            this.instancesById.delete(instanceId)
            throw Error('Was able to start the instance, but it seems to have crashed');
        }

        if (latestStatus.timeMs > instance.status.timeMs) {
            instanceEmitter.fire(latestStatus);
            this.updatedEmitter.fire(instance);
        }

        return instance;
    }

    public async getOrCreateInstance(serverProxy: ServerProxy, context: any): Promise<ServerProxyInstance> {
        const currentInstanceStatus = await this.serverProxyRpcServer.getInstance(
            serverProxy.id,
            context
        );

        if (currentInstanceStatus) {
            return this.buildServerProxyInstance(serverProxy, context, currentInstanceStatus);
        }

        return this.startInstance(serverProxy, context);
    }

    public async startInstance(serverProxy: ServerProxy, context: any): Promise<ServerProxyInstance> {
        const instanceStatus = await this.serverProxyRpcServer.startInstance(
            serverProxy.id,
            context
        );

        return this.buildServerProxyInstance(serverProxy, context, instanceStatus);
    }

    public async getInstances(): Promise<ServerProxyInstance[]> {
        return Array.from(
            this.instancesById.values(),
            ({ instance }) => instance
        );
    }

    public async getInstancesByType(serverProxyId: string): Promise<ServerProxyInstance[]> {
        return (await this.getInstances()).filter(s => s.serverProxy.id == serverProxyId);
    }

    dispose(): void {
        this.disposable.dispose();
        this.instancesById.forEach(({ instanceEmitter }) => instanceEmitter.dispose());
        this.instancesById.clear();
    }
}
