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
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { OpenerService } from '@theia/core/lib/browser';
import { Extension } from '../common/const';
import ServerProxyContext from '../common/server-proxy-context';
import { ServerProxyInstanceManager } from 'theia-server-proxy-extension/lib/browser/server-proxy-instance-manager';
import { ServerProxyOpenHandler } from 'theia-server-proxy-extension/lib/browser/server-proxy-open-handler';

@injectable()
export class JupyterCommandContribution implements CommandContribution {
    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(ServerProxyInstanceManager)
    protected readonly serverProxyInstanceManager: ServerProxyInstanceManager;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand({
            id: Extension.ID,
            label: `Open For Current Workspace`,
            category: Extension.Name
        }, {
            execute: async () => {
                const roots = await this.workspaceService.roots
                if (!roots) {
                    // TODO 1 show error
                    return;
                }

                if (roots.length != 1) {
                    // TODO 1 handle better
                    return;
                }

                const context: ServerProxyContext = {
                    path: roots[0].resource.path.toString()
                }

                const instance = await this.serverProxyInstanceManager.getOrCreateInstance(
                    Extension.ServerProxy,
                    context
                );

                await ServerProxyOpenHandler.open(
                    this.openerService,
                    instance
                );
            }
        });
    }
}
