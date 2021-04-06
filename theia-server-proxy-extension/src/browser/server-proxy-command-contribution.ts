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
import { CommandContribution, CommandRegistry } from '@theia/core';
import { ServerProxyRpcServer } from '../common/rpc';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { ServerProxyWidgetOpenHandler } from './server-proxy-widget-open-handler';
import { buildUri } from './server-proxy-uri';

@injectable()
export class ServerProxyCommandContribution implements CommandContribution {
    // TODO 1: should we use the url handler here instead?
    @inject(ServerProxyWidgetOpenHandler)
    protected readonly serverProxyWidgetManager: ServerProxyWidgetOpenHandler;

    @inject(ServerProxyRpcServer)
    protected readonly serverProxyServer: ServerProxyRpcServer;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    // TODO 1: this isn't async...
    registerCommands(registry: CommandRegistry): void {
        this.serverProxyServer.getServerProxies().then(proxies =>
            proxies.forEach(s => {
                // TODO 2 icons and such?
                registry.registerCommand({
                    id: s.id,
                    label: `Open For Current Workspace`,
                    category: s.name
                }, {
                    execute: async () => {
                        const roots = await this.workspaceService.roots;
                        if (!roots) {
                            // TODO 1 show error
                            return;
                        }

                        if (roots.length != 1) {
                            // TODO 1 handle better
                            return;
                        }

                        const workspacePath = roots[0].resource.path;
                        const uri = buildUri(
                            s.id,
                            workspacePath
                        )

                        await this.serverProxyWidgetManager.open(uri);
                    }
                });
            })
        );
    }
}
