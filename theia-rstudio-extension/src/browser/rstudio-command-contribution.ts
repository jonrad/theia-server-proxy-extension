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
import { ApplicationShell, WidgetManager } from '@theia/core/lib/browser';
import { Extension } from '../common/const';
import { ServerProxyWidget } from 'theia-server-proxy-extension/lib/browser/server-proxy-widget';

@injectable()
export class RstudioCommandContribution implements CommandContribution {
    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand({
            id: Extension.ID,
            label: `Start`,
            category: Extension.Name
        }, {
            execute: async () => {
                const widget = await this.widgetManager.getOrCreateWidget(
                    ServerProxyWidget.ID,
                    {
                        serverProxy: Extension.ServerProxy,
                        context: {}
                    });

                await this.shell.addWidget(widget);
                if (widget.isAttached) {
                    await this.shell.activateWidget(widget.id);
                }
            }
        });
    }
}
