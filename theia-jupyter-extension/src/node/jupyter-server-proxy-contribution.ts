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
import { ServerProxyContribution, ServerProxyCommand, BaseServerProxyInstanceBuilder } from 'theia-server-proxy-extension/lib/node/server-proxy-contribution';
import * as path from 'path';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { Extension } from '../common/const';
import ServerProxyContext from '../common/server-proxy-context';

const ENV_JUPYTER_CUSTOM_PROCESS: string = 'ENV_JUPYTER_CUSTOM_PROCESS';
const ENV_JUPYTER_PATH: string = 'ENV_JUPYTER_PATH';

@injectable()
export class JupyterServerProxyInstanceBuilder extends BaseServerProxyInstanceBuilder<ServerProxyContext> {
    id: string = Extension.ID


    constructor(
        @inject(EnvVariablesServer) private readonly envVariablesServer: EnvVariablesServer
    ) {
        super();
    }

    async getCommand(relativeUrl: string, context: ServerProxyContext): Promise<ServerProxyCommand> {
        const configDir = path.join(__dirname, "../../assets/.jupyter");

        const workspacePath: string = context.path;

        const customProcess = (await this.envVariablesServer.getValue(ENV_JUPYTER_CUSTOM_PROCESS))?.value;

        const port = await this.findAvailablePort();

        // Is this the best/proper way to do this? I dunno
        if (customProcess) {
            const command = [
                customProcess,
                port.toString(),
                workspacePath,
                relativeUrl,
                configDir
            ]

            return { command, port: port };
        } else {
            const jupyterPath = (await this.envVariablesServer.getValue(ENV_JUPYTER_PATH))?.value || "jupyter-notebook";

            const command = [
                jupyterPath,
                `--NotebookApp.ip=0.0.0.0`,
                `--NotebookApp.port=${port.toString()}`,
                `--NotebookApp.notebook_dir=${workspacePath}`,
                `--NotebookApp.base_url=${relativeUrl}`,
                `--NotebookApp.token=`,
                `--NotebookApp.tornado_settings={'headers': {'Content-Security-Policy': \"frame-ancestors * 'self' \"}}`,
                '--NotebookApp.open_browser=False'
            ];

            // sigh... is there a better way to do this?
            const env = { ["JUPYTER_CONFIG_DIR"]: configDir }

            return {
                command,
                port: port,
                env
            }
        }
    }
}

@injectable()
export class JupyterServerProxyContribution implements ServerProxyContribution {
    id: string = Extension.ID;

    name: string = Extension.Name;

    constructor(
        @inject(JupyterServerProxyInstanceBuilder) public readonly serverProxyInstanceBuilder: JupyterServerProxyInstanceBuilder) {
    }
}
