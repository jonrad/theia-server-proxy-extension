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
import { ServerProxyRpcClient, ServerProxyRpcServer } from '../common/rpc';
import { ServerProxy, ServerProxyInstanceStatus, ServerProxyInstance as ServerProxyInstanceDto } from '../common/server-proxy';
import { Disposable, Emitter, Event } from '@theia/core';
import { ServerProxyInstance } from './server-proxy-instance';
import { ServerProxyManager } from './server-proxy-manager';

@injectable()
export class ServerProxyInstanceManager implements Disposable {
    private readonly disposable: Disposable;

    private readonly instancesById: Map<string, { instance: ServerProxyInstance, instanceEmitter: Emitter<ServerProxyInstanceStatus> }> =
        new Map<string, { instance: ServerProxyInstance, instanceEmitter: Emitter<ServerProxyInstanceStatus> }>();

    public readonly updated: Event<ServerProxyInstance>;
    private readonly updatedEmitter: Emitter<ServerProxyInstance>;

    constructor(
        @inject(ServerProxyRpcServer) private readonly serverProxyRpcServer: ServerProxyRpcServer,
        @inject(ServerProxyRpcClient) private readonly serverProxyRpcClient: ServerProxyRpcClient,
        @inject(ServerProxyManager) private readonly serverProxyManager: ServerProxyManager
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

    @postConstruct()
    protected async init(): Promise<void> {
        const instances = await this.serverProxyRpcServer.getInstances();
        instances.forEach(dto => this.buildServerProxyInstance(dto));
    }

    private async buildServerProxyInstance(
        dto: ServerProxyInstanceDto
    ): Promise<ServerProxyInstance> {
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
        this.updatedEmitter.fire(instance);

        // The status may have updated before we added it to the dictionary. So let's verify we have the latest
        const latestStatus = await this.serverProxyRpcServer.getInstanceStatus(
            instance.id
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
        const instanceDto = await this.serverProxyRpcServer.getInstance(
            serverProxy.id,
            JSON.stringify(context)
        );

        if (instanceDto) {
            return this.buildServerProxyInstance(instanceDto);
        }

        return this.startInstance(serverProxy, context);
    }

    public async startInstance(serverProxy: ServerProxy, context: any): Promise<ServerProxyInstance> {
        const instanceDto = await this.serverProxyRpcServer.startInstance(
            serverProxy.id,
            JSON.stringify(context)
        );

        return this.buildServerProxyInstance(instanceDto);
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
