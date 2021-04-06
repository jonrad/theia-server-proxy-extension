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
import { injectable } from 'inversify';
import { ServerProxyCommandContext, ServerProxyContribution, ServerProxyCommand } from 'theia-server-proxy-extension/lib/node/server-proxy-contribution';
import * as path from 'path';

@injectable()
export class RStudioServerProxyContribution implements ServerProxyContribution {
    id: string = "rstudio";

    name: string = "RStudio";

    getCommand(context: ServerProxyCommandContext): ServerProxyCommand[] {
        const settingsPath = path.join(__dirname, "../../assets/rserver.conf");

        const command = [
            "docker",
            "run",
            "--rm",
            "-p",
            `${context.port}:8787`,
            "-e",
            "DISABLE_AUTH=true",
            "-v",
            `${settingsPath}:/etc/rstudio/rserver.conf`,
            "-v",
            `${context.workspacePath}:/home/rstudio`,
            "rocker/rstudio",
        ]

        return {
            command
        };
    }

    getMiddleware(basePath: string, baseOptions: Options): RequestHandler {
        baseOptions.pathRewrite = {
            '^(/[^ /]*){3}': ''
        };

        return createProxyMiddleware(basePath, baseOptions);
    }
}
