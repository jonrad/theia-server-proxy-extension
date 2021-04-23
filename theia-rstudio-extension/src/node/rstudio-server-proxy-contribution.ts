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

import { createProxyMiddleware, Options, RequestHandler } from 'http-proxy-middleware';
import { injectable, inject } from 'inversify';
import { ServerProxyContribution, ServerProxyCommand, BaseServerProxyInstanceBuilder } from 'theia-server-proxy-extension/lib/node/server-proxy-contribution';
import * as path from 'path';
import * as os from 'os';
import { ServerProxyInstance } from 'theia-server-proxy-extension/lib/node/server-proxy-instance';
import { ServerProxyInstanceStatus } from 'theia-server-proxy-extension/lib/common/server-proxy';

@injectable()
export class RStudioServerProxyInstanceBuilder extends BaseServerProxyInstanceBuilder<void> {
    id: string;

    instance: ServerProxyInstance | undefined;

    async build(instanceId: number, relativeUrl: string, context: void): Promise<ServerProxyInstance> {
        if (!this.instance || ServerProxyInstanceStatus.isCompleted(this.instance.status)) {
            this.instance = await super.build(instanceId, relativeUrl, context);
        }

        return this.instance;
    }

    async getCommand(relativeUrl: string, context: any): Promise<ServerProxyCommand> {
        const settingsPath = path.join(__dirname, "../../assets/rserver.conf");
        const port = 8787;

        const command = [
            "docker",
            "run",
            "--rm",
            "-p",
            `${port}:8787`,
            "-e",
            "DISABLE_AUTH=true",
            "-v",
            `${settingsPath}:/etc/rstudio/rserver.conf`,
            "-v",
            `${os.homedir()}:/home/rstudio`,
            "rocker/rstudio"
        ]

        return {
            port,
            command
        };
    }
}

@injectable()
export class RStudioServerProxyContribution implements ServerProxyContribution {

    id: string = "rstudio";

    name: string = "RStudio";

    instance: ServerProxyInstance | undefined;

    constructor(
        @inject(RStudioServerProxyInstanceBuilder) public readonly serverProxyInstanceBuilder: RStudioServerProxyInstanceBuilder
    ) {
    }

    getMiddleware(basePath: string, baseOptions: Options): RequestHandler {
        baseOptions.pathRewrite = {
            '^(/[^ /]*){3}': ''
        };

        return createProxyMiddleware(basePath, baseOptions);
    }
}
