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
import { OpenerService } from '@theia/core/lib/browser';
import { Extension } from '../common/const';
import { ServerProxyInstanceManager } from 'theia-server-proxy-extension/lib/browser/server-proxy-instance-manager';
import { ServerProxyOpenHandler } from 'theia-server-proxy-extension/lib/browser/server-proxy-open-handler';
import { FileNavigatorContribution } from '@theia/navigator/lib/browser/navigator-contribution';
import ServerProxyContext from '../common/server-proxy-context';
import { QuickInputService } from '@theia/core/lib/browser';

@injectable()
export class MlFlowUiCommandContribution implements CommandContribution {
    @inject(ServerProxyInstanceManager)
    protected readonly serverProxyInstanceManager: ServerProxyInstanceManager;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(FileNavigatorContribution)
    protected readonly fileNavigatorContribution: FileNavigatorContribution;

    @inject(ServerProxyOpenHandler)
    protected readonly serverProxyOpenHandler: ServerProxyOpenHandler;

    @inject(QuickInputService)
    protected readonly quickInputService: QuickInputService;

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand({
            id: Extension.ID,
            label: `Open MLflow`,
            category: Extension.Name
        }, {
            execute: async (backendStoreUri: string) => {
                if (!backendStoreUri) {
                    return;
                }

                const context: ServerProxyContext = {
                    backendStoreUri
                };

                const instance = await this.serverProxyInstanceManager.getOrCreateInstance(
                    Extension.ServerProxy,
                    context
                );

                await this.serverProxyOpenHandler.openInstance(
                    instance
                );
            }
        });
    }
}
