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
import { ServerProxyCommandContext, ServerProxyContribution, ServerProxyCommand } from 'theia-server-proxy-extension/lib/node/server-proxy-contribution';
import * as path from 'path';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';

const ENV_JUPYTER_CUSTOM_PROCESS: string = 'ENV_JUPYTER_CUSTOM_PROCESS';
const ENV_JUPYTER_PATH: string = 'ENV_JUPYTER_PATH';

@injectable()
export class JupyterServerProxyContribution implements ServerProxyContribution {
    @inject(EnvVariablesServer)
    private readonly envVariablesServer: EnvVariablesServer;

    id: string = "jupyter";

    name: string = "Jupyter";

    async getCommand(context: ServerProxyCommandContext): Promise<ServerProxyCommand> {
        const configDir = path.join(__dirname, "../../assets/.jupyter");

        // Is this the best/proper way to do this? I dunno
        const customProcess = await this.envVariablesServer.getValue(ENV_JUPYTER_CUSTOM_PROCESS)
        if (customProcess?.value) {
            const command = [
                customProcess.value,
                context.port.toString(),
                context.workspacePath.toString(),
                context.relativeUrl,
                configDir
            ]

            return { command };
        } else {
            const binary = (await this.envVariablesServer.getValue(ENV_JUPYTER_PATH))?.value || "jupyter";

            const command = [
                binary,
                "notebook",
                '--NotebookApp.port',
                context.port.toString(),
                '--NotebookApp.notebook_dir',
                context.workspacePath.toString(),
                '--NotebookApp.base_url',
                context.relativeUrl,
                `--NotebookApp.token`,
                '',
                '--NotebookApp.tornado_settings',
                `{'headers': {'Content-Security-Policy': "frame-ancestors * 'self' "}}`,
                '--NotebookApp.open_browser',
                'False'
            ];

            // sigh... is there a better way to do this?
            const env = { ["JUPYTER_CONFIG_DIR"]: configDir }

            return {
                command,
                env
            }
        }
    }
}
