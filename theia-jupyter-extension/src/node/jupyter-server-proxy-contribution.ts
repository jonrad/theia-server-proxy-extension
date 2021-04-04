/********************************************************************************
 * Copyright (C) 2018 Ericsson and others.
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

import { injectable } from 'inversify';
import { ServerProxyCommandContext, ServerProxyContribution } from 'theia-server-proxy-extension/lib/node/server-proxy-contribution';
import * as path from 'path';

@injectable()
export class JupyterServerProxyContribution implements ServerProxyContribution {
    id: string = "jupyter";

    name: string = "Jupyter";

    getCommand(context: ServerProxyCommandContext): string[] {
        const settingsPath = path.join(__dirname, "../../assets/.jupyter");

        return [
            "docker",
            "run",
            "--rm",
            "-p",
            `${context.port}:8888`,
            "-v",
            `${settingsPath}:/home/jovyan/.jupyter`,
            "-v",
            `${context.workspacePath}:/mnt`,
            "jupyter/minimal-notebook:latest",
            "start-notebook.sh",
            `--NotebookApp.base_url=${context.relativeUrl}`,
            `--NotebookApp.token=''`,
            `--NotebookApp.notebook_dir='/mnt'`,
            `--NotebookApp.tornado_settings={'headers': {'Content-Security-Policy': "frame-ancestors * 'self' "}}`,
        ]
    }
}
