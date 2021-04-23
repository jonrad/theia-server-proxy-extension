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
    private instanceById: Map<number, ServerProxyInstance> = new Map<number, ServerProxyInstance>()

    // does it matter that people can 'guess' other instance ids?
    private lastInstanceId = 0;

    @inject(ILogger)
    protected readonly logger: ILogger;

    public getInstancePort(id: number): number | undefined {
        return this.instanceById.get(id)?.port;
    }

    public async getInstance(
        serverProxyId: string,
        context: any
    ): Promise<ServerProxyInstance | undefined> {
        for (const instance of this.instanceById.values()) {
            if (instance.serverProxyId == serverProxyId && instance.context == context) {
                return instance;
            }
        }

        return undefined;
    }

    public async startInstance(
        serverProxy: ServerProxyContribution,
        context: any
    ): Promise<ServerProxyInstance> {

        const existingInstance = await this.getInstance(serverProxy.id, context);
        if (existingInstance) {
            return existingInstance;
        }

        const instanceId = ++this.lastInstanceId;

        const relativeUrl = `/server-proxy/${serverProxy.id}/${instanceId}`;

        const instance = await serverProxy.serverProxyInstanceBuilder.build(
            instanceId,
            relativeUrl,
            context
        );

        this.instanceById.set(instanceId, instance);

        const maybeCleanup = () => {
            if (ServerProxyInstanceStatus.isCompleted(instance.status)) {
                this.instanceById.delete(instanceId);
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
        instanceId: number
    ): ServerProxyInstanceStatus | undefined {
        return this.instanceById.get(instanceId)?.status;
    }

    public async stopInstance(id: number): Promise<Boolean> {
        const instance = this.instanceById.get(id);
        this.instanceById.delete(id);

        if (instance) {
            await instance.stop();
            return true;
        } else {
            return false;
        }
    }
}
