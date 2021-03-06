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

import { Options, RequestHandler } from "http-proxy-middleware";
import { ProcessServerProxyInstance, ServerProxyInstance } from "./server-proxy-instance";
import { RawProcessFactory, RawProcessOptions } from '@theia/process/lib/node';
import { inject, injectable } from 'inversify';
import * as getAvailablePort from 'get-port';
import { ILogger } from '@theia/core';
import { ServerProxyUrlManager } from "../common/server-proxy-url-manager";
import { ServerProxy } from "../common/server-proxy";

export const ServerProxyContribution = Symbol('ServerProxyContribution');
export interface ServerProxyContribution {
    readonly id: string;

    readonly name: string;

    readonly serverProxyInstanceBuilder: ServerProxyInstanceBuilder;

    getMiddleware?(basePath: string, baseOptions: Options): RequestHandler
}

export interface ServerProxyInstanceBuilder {
    build(instanceId: string, context: any): Promise<ServerProxyInstance>
}

export interface ServerProxyCommand {
    command: string[]

    port: number

    validationPath?: string

    env?: { [name: string]: string | undefined }
}

@injectable()
export abstract class BaseServerProxyInstanceBuilder<T> implements ServerProxyInstanceBuilder {
    abstract serverProxy: ServerProxy;

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(RawProcessFactory)
    private readonly rawProcessFactory: RawProcessFactory;

    @inject(ServerProxyUrlManager)
    protected readonly serverProxyUrlManager: ServerProxyUrlManager;

    abstract getCommand(instanceId: string, context: any): Promise<ServerProxyCommand>;

    protected async findAvailablePort(): Promise<number> {
        return await getAvailablePort();
    }

    async build(instanceId: string, context: T): Promise<ServerProxyInstance> {
        const { command, env, port, validationPath } = await this.getCommand(
            instanceId,
            context
        );

        if (command.length == 0) {
            throw Error(`Improperly configured server proxy ${this.serverProxy.id}. Returned empty command`);
        }

        this.logger.info(`server-proxy mapping instance id ${instanceId} for ${this.serverProxy.id} to port ${port}`);

        const envDict: { [name: string]: string | undefined } =
            env ? { ...process.env, ...env } : process.env;

        const options: RawProcessOptions = {
            command: command[0],
            args: command.slice(1),
            options: {
                env: envDict,
                // TODO: ideally we'd make this log with details about the instance id etc
                stdio: 'inherit'
            }
        };

        const rawProcess = this.rawProcessFactory(options);

        return new ProcessServerProxyInstance(
            instanceId,
            context,
            this.serverProxy.id,
            port,
            `http://localhost:${port}${validationPath || ''}`,
            rawProcess
        );
    }

    getMiddleware?(basePath: string, baseOptions: Options): RequestHandler
}
