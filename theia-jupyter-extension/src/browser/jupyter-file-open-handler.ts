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

import URI from '@theia/core/lib/common/uri';
import { inject, injectable } from 'inversify';
import { OpenHandler, FrontendApplication, OpenerService, WidgetManager } from '@theia/core/lib/browser';
import { IFrameWidget, IFrameWidgetMode } from 'theia-server-proxy-iframe-extension/lib/browser/iframe-widget'
import { ServerProxyInstanceManager } from 'theia-server-proxy-extension/lib/browser/server-proxy-instance-manager';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { Path } from '@theia/core';
import { Extension } from '../common/const';
import { IFrameStatus } from 'theia-server-proxy-iframe-extension/lib/browser/iframe-status';

@injectable()
export class JupyterFileOpenHandler implements OpenHandler {

    readonly id = 'jupyter.file.openhandler';
    readonly label = 'Open in Jupyter';

    @inject(FrontendApplication)
    protected readonly app: FrontendApplication;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(ServerProxyInstanceManager)
    protected readonly serverProxyInstanceManager: ServerProxyInstanceManager;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    canHandle(uri: URI): number {
        try {
            if (uri.path.ext.toLocaleLowerCase() == ".ipynb") {
                return 200;
            }

            return 0;
        } catch {
            return 0;
        }
    }

    private async fallback(uri: URI): Promise<object | undefined> {
        const openHandler = (await this.openerService.getOpeners(uri))
            .find(p => p != this);

        return openHandler?.open(uri);
    }

    async open(uri: URI): Promise<object | undefined> {
        const workspace = this.workspaceService.getWorkspaceRootUri(uri);
        if (!workspace) {
            return this.fallback(uri);
        }

        const relativeFilePath = workspace.relative(uri)
        if (!relativeFilePath) {
            return this.fallback(uri);
        }

        const instance = (await this.serverProxyInstanceManager.getInstancesByType(Extension.ID))
            .filter(w => workspace.relative(new URI(w.context.path)))[0]; //TODO can we strongly type this

        if (!instance) {
            return this.fallback(uri);
        }

        const path = new Path(`server-proxy/${Extension.ID}/${instance.id}/notebooks/`)
            .join(relativeFilePath.toString())

        const iframeUri = path.toString();

        const widgetId = IFrameWidget.buildWidgetId(iframeUri);

        const appWidget = await this.app.shell.activateWidget(widgetId) as IFrameWidget;
        if (appWidget) {
            return appWidget;
        }

        const widget = await this.widgetManager.getOrCreateWidget(
            IFrameWidget.ID,
            {
                id: widgetId,
                name: uri.path.name,
                mode: IFrameWidgetMode.MiniBrowser,
                startUrl: path.toString(),
                status: IFrameStatus.ready
            });

        await this.app.shell.addWidget(widget, { area: 'main' });
        await this.app.shell.activateWidget(widget.id);

        return widget;
    }
}
