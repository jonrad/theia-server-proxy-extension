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
import { ServerProxyInstance, ServerProxyInstanceImpl, ServerProxyInstanceImplFactory, ServerProxyInstanceProps } from './server-proxy-instance';
import { ServerProxyManager } from './server-proxy-manager';
import { ServerProxyRpcServerProxy } from './server-proxy-rpc-server-proxy';

@injectable()
export class ServerProxyInstanceManager implements Disposable {
    private readonly toDispose: Disposable[] = [];

    private readonly instancesById: Map<string, ServerProxyInstanceImpl> =
        new Map<string, ServerProxyInstanceImpl>();

    public readonly updated: Event<ServerProxyInstance | undefined>;
    private readonly updatedEmitter: Emitter<ServerProxyInstance | undefined>;

    constructor(
        @inject(ServerProxyRpcServerProxy) private readonly serverProxyRpcServer: ServerProxyRpcServerProxy,
        @inject(ServerProxyRpcClient) private readonly serverProxyRpcClient: ServerProxyRpcClient,
        @inject(ServerProxyManager) private readonly serverProxyManager: ServerProxyManager,
        @inject(ServerProxyInstanceImplFactory) private readonly serverProxyInstanceFactory: (props: ServerProxyInstanceProps) => ServerProxyInstanceImpl
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


        this.toDispose.push(this.serverProxyRpcClient.statusChanged(async status => {
            const instance = await this.tryUpdateInstanceStatus(status.instanceId, status);

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
            if (!serverInstancesById.has(localInstance.id)) {
                this.instancesById.delete(localInstance.id);
                localInstance.setStatus({
                    instanceId: localInstance.id,
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
        return Array.from(this.instancesById.values());
    }

    public getInstanceById(instanceId: string): ServerProxyInstance | undefined {
        return this.instancesById.get(instanceId);
    }

    public async getInstancesByType(serverProxyId: string): Promise<ServerProxyInstance[]> {
        return (await this.getInstances()).filter(s => s.serverProxy.id == serverProxyId);
    }

    private async buildServerProxyInstance(
        dto: ServerProxyInstanceDto
    ): Promise<ServerProxyInstance | undefined> {
        const instanceId = dto.id;
        const status = dto.lastStatus;

        const serverProxy = this.serverProxyManager.getServerProxyById(dto.serverProxyId);

        if (!serverProxy) {
            throw Error("Something is misconfigured");
        }

        const instance = this.serverProxyInstanceFactory({
            id: instanceId,
            serverProxy,
            context: JSON.parse(dto.context),
            status,
        });

        // At this point, the status checker will be able to refresh our new instance
        this.instancesById.set(instance.id, instance);

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

            await this.tryUpdateInstanceStatus(instanceId, latestStatus);

            return instance;
        } finally {
            this.updatedEmitter.fire(instance);
        }
    }

    private async handleInstanceFromServer(serverInstance: ServerProxyInstanceDto): Promise<ServerProxyInstance | undefined> {
        const instance = this.instancesById.get(serverInstance.lastStatus.instanceId);
        if (!instance) {
            return await this.buildServerProxyInstance(serverInstance);
        }

        return await this.tryUpdateInstanceStatus(serverInstance.id, serverInstance.lastStatus);
    }

    private async tryUpdateInstanceStatus(instanceId: string, status: ServerProxyInstanceStatus): Promise<ServerProxyInstance | undefined> {
        let instance = this.instancesById.get(instanceId);
        if (!instance) {
            const instanceDto = await this.serverProxyRpcServer.getInstanceById(instanceId);
            if (!instanceDto) {
                return;
            }

            await this.buildServerProxyInstance(instanceDto)

            return;
        }

        if (instance.status.timeMs > status.timeMs) {
            return instance;
        }

        instance.setStatus(status);

        if (ServerProxyInstanceStatus.isCompleted(status)) {
            this.instancesById.delete(status.instanceId);
        }

        return instance;
    }

    dispose(): void {
        this.toDispose.forEach(d => d.dispose());
        this.toDispose.splice(0);

        this.instancesById.clear();
    }
}
