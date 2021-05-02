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
import { ServerProxyRpcClient } from '../common/rpc';
import { ServerProxy, ServerProxyInstanceStatus, ServerProxyInstance as ServerProxyInstanceDto, StatusId } from '../common/server-proxy';
import { Disposable, Emitter, Event } from '@theia/core';
import { ServerProxyInstance } from './server-proxy-instance';
import { ServerProxyManager } from './server-proxy-manager';
import { ServerProxyRpcServerProxy } from './server-proxy-rpc-server-proxy';

@injectable()
export class ServerProxyInstanceManager implements Disposable {
    private readonly toDispose: Disposable[] = [];

    private readonly instancesById: Map<string, { instance: ServerProxyInstance, instanceEmitter: Emitter<ServerProxyInstanceStatus> }> =
        new Map<string, { instance: ServerProxyInstance, instanceEmitter: Emitter<ServerProxyInstanceStatus> }>();

    public readonly updated: Event<ServerProxyInstance | undefined>;
    private readonly updatedEmitter: Emitter<ServerProxyInstance | undefined>;

    constructor(
        @inject(ServerProxyRpcServerProxy) private readonly serverProxyRpcServer: ServerProxyRpcServerProxy,
        @inject(ServerProxyRpcClient) private readonly serverProxyRpcClient: ServerProxyRpcClient,
        @inject(ServerProxyManager) private readonly serverProxyManager: ServerProxyManager
    ) {
        this.updatedEmitter = new Emitter<ServerProxyInstance | undefined>();
        this.updated = this.updatedEmitter.event;

        const onInitialized = this.serverProxyRpcServer.onDidOpenConnection(() => {
            // skip reconnection on the first connection
            onInitialized.dispose();
            this.serverProxyRpcServer.onDidOpenConnection(() => {
                // reconnected
                this.updateAllInstances();
            });
        });


        this.toDispose.push(this.serverProxyRpcClient.statusChanged(status => {
            const instance = this.tryUpdateInstanceStatus(status.instanceId, status);

            this.updatedEmitter.fire(instance);
        }));
    }

    @postConstruct()
    protected init(): Promise<void> {
        return this.updateAllInstances();
    }

    protected async updateAllInstances(): Promise<void> {
        // note: there's a lot of race conditions here because of the awaits
        const serverInstances = await this.serverProxyRpcServer.getInstances();

        for (const serverInstance of serverInstances) {
            await this.handleInstanceFromServer(serverInstance);
        }

        const serverInstancesById = new Map(serverInstances.map(i => [i.id, i]));
        for (const localInstance of this.instancesById.values()) {
            if (!serverInstancesById.has(localInstance.instance.id)) {
                this.instancesById.delete(localInstance.instance.id);
                localInstance.instanceEmitter.fire({
                    instanceId: localInstance.instance.id,
                    statusId: StatusId.errored,
                    timeMs: new Date().getTime(),
                    statusMessage: "Server Proxy instance no longer exists"
                });
            }
        }

        this.updatedEmitter.fire(undefined);
    }

    public async getOrCreateInstance(serverProxy: ServerProxy, context: any): Promise<ServerProxyInstance> {
        const instanceDto = await this.serverProxyRpcServer.getInstance(
            serverProxy.id,
            JSON.stringify(context)
        );

        if (instanceDto) {
            const instance = await this.handleInstanceFromServer(instanceDto);
            if (!instance) {
                throw Error("Something went wrong starting the instance");
            }

            return instance;
        }

        return this.startInstance(serverProxy, context);
    }

    public async startInstance(serverProxy: ServerProxy, context: any): Promise<ServerProxyInstance> {
        const instanceDto = await this.serverProxyRpcServer.startInstance(
            serverProxy.id,
            JSON.stringify(context)
        );

        const instance = await this.handleInstanceFromServer(instanceDto);

        if (!instance) {
            throw Error("Something went wrong starting the instance");
        }

        return instance;
    }

    public async getInstances(): Promise<ServerProxyInstance[]> {
        return Array.from(
            this.instancesById.values(),
            ({ instance }) => instance
        );
    }

    public getInstanceById(instanceId: string): ServerProxyInstance | undefined {
        return this.instancesById.get(instanceId)?.instance;
    }

    public async getInstancesByType(serverProxyId: string): Promise<ServerProxyInstance[]> {
        return (await this.getInstances()).filter(s => s.serverProxy.id == serverProxyId);
    }

    private async buildServerProxyInstance(
        dto: ServerProxyInstanceDto
    ): Promise<ServerProxyInstance | undefined> {
        const instanceId = dto.id;
        const status = dto.lastStatus;

        const instanceEmitter = new Emitter<ServerProxyInstanceStatus>();
        const serverProxy = this.serverProxyManager.getServerProxyById(dto.serverProxyId);

        if (!serverProxy) {
            throw Error("Something is misconfigured");
        }

        const instance = new ServerProxyInstance(
            instanceId,
            serverProxy,
            JSON.parse(dto.context),
            status,
            this.serverProxyRpcServer,
            instanceEmitter.event
        );

        // At this point, the status checker will be able to refresh our new instance
        this.instancesById.set(instance.id, { instance, instanceEmitter });

        try {
            // The status may have updated before we added it to the dictionary. So let's verify we have the latest
            const latestStatus = await this.serverProxyRpcServer.getInstanceStatus(
                instance.id
            )

            if (!latestStatus) {
                // Server lost our instance somehow (eg it crashed)
                this.instancesById.delete(instanceId);
                return undefined;
            }

            this.tryUpdateInstanceStatus(instanceId, latestStatus);

            return instance;
        } finally {
            this.updatedEmitter.fire(instance);
        }
    }

    private async handleInstanceFromServer(serverInstance: ServerProxyInstanceDto): Promise<ServerProxyInstance | undefined> {
        const instanceWithEmitter = this.instancesById.get(serverInstance.lastStatus.instanceId);
        if (!instanceWithEmitter) {
            return await this.buildServerProxyInstance(serverInstance);
        }

        return await this.tryUpdateInstanceStatus(serverInstance.id, serverInstance.lastStatus);
    }

    private tryUpdateInstanceStatus(instanceId: string, status: ServerProxyInstanceStatus): ServerProxyInstance | undefined {
        const instanceWithEmitter = this.instancesById.get(instanceId);
        if (!instanceWithEmitter) {
            return;
        }

        const { instance, instanceEmitter } = instanceWithEmitter;

        if (instance.status.timeMs > status.timeMs) {
            return instance;
        }

        instanceEmitter.fire(status);

        if (ServerProxyInstanceStatus.isCompleted(status)) {
            this.instancesById.delete(status.instanceId);
        }

        return instance;
    }

    dispose(): void {
        this.toDispose.forEach(d => d.dispose());
        this.toDispose.splice(0);
        this.instancesById.forEach(({ instance, instanceEmitter }) => {
            instance.dispose();
            instanceEmitter.dispose();
        });

        this.instancesById.clear();
    }
}
