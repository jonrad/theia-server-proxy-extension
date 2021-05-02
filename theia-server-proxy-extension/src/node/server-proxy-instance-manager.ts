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
import { ILogger } from '@theia/core';
import { ServerProxyInstanceStatus } from '../common/server-proxy';
import { ServerProxyInstance } from './server-proxy-instance';
import { ServerProxyContribution } from './server-proxy-contribution';

@injectable()
export class ServerProxyInstanceManager {
    private instanceById: Map<string, ServerProxyInstance> = new Map<string, ServerProxyInstance>()
    private instanceByContext: Map<string, ServerProxyInstance> =
        new Map<string, ServerProxyInstance>()

    // does it matter that people can 'guess' other instance ids?
    private lastInstanceId = 0;

    @inject(ILogger)
    protected readonly logger: ILogger;

    public getInstancePort(id: string): number | undefined {
        return this.instanceById.get(id)?.port;
    }

    public getInstance(
        serverProxyId: string,
        context: any
    ): ServerProxyInstance | undefined {
        return this.instanceByContext.get(JSON.stringify({
            serverProxyId: serverProxyId,
            context: context
        }));
    }

    public getInstanceById(
        id: string
    ): ServerProxyInstance | undefined {
        return this.instanceById.get(id);
    }

    public getInstances(): ServerProxyInstance[] {
        return Array.from(this.instanceById.values());
    }

    public async startInstance(
        serverProxy: ServerProxyContribution,
        context: any
    ): Promise<ServerProxyInstance> {

        const existingInstance = await this.getInstance(serverProxy.id, context);
        if (existingInstance) {
            return existingInstance;
        }

        const instanceId = (++this.lastInstanceId).toString();

        const relativeUrl = `/server-proxy/${serverProxy.id}/${instanceId}`;

        const instance = await serverProxy.serverProxyInstanceBuilder.build(
            instanceId,
            relativeUrl,
            context
        );

        this.instanceById.set(instanceId, instance);
        const contextKey = JSON.stringify({ serverProxyId: serverProxy.id, context: context });
        this.instanceByContext.set(contextKey, instance);

        const maybeCleanup = () => {
            if (ServerProxyInstanceStatus.isCompleted(instance.status)) {
                this.instanceById.delete(instanceId);
                this.instanceByContext.delete(contextKey);
                instance.dispose();
            }
        }

        instance.statusChanged(() => {
            maybeCleanup();
        })

        maybeCleanup();

        instance.init();

        return instance;
    }

    public getInstanceStatus(
        instanceId: string
    ): ServerProxyInstanceStatus | undefined {
        return this.instanceById.get(instanceId)?.status;
    }

    public async stopInstance(id: string): Promise<Boolean> {
        const instance = this.instanceById.get(id);
        console.log("Called stopInstance");

        if (instance) {
            return await instance.stop();
        } else {
            return false;
        }
    }
}
