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

// install.packages("rstudioapi", type = "source")
import URI from '@theia/core/lib/common/uri';
import { ILogger } from '@theia/core';
import { inject, injectable } from 'inversify';
import { OpenHandler, FrontendApplication, OpenerService, WidgetManager } from '@theia/core/lib/browser';
import * as http from 'http';
import { ServerProxyInstanceManager } from 'theia-server-proxy-extension/lib/browser/server-proxy-instance-manager';
import { ServerProxyWidget } from 'theia-server-proxy-extension/lib/browser/server-proxy-widget';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { Extension } from '../common/const';
import { ServerProxyRpcServer } from 'theia-server-proxy-extension/lib/common/rpc';

@injectable()
export class RStudioOpenHandler implements OpenHandler {

    readonly id = 'rstudio.openhandler';
    readonly label = 'Open in RStudio';

    @inject(FrontendApplication)
    protected readonly app: FrontendApplication;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(ServerProxyInstanceManager)
    protected readonly serverProxyInstanceManager: ServerProxyInstanceManager;

    @inject(ServerProxyRpcServer)
    protected readonly serverProxyRpcServer: ServerProxyRpcServer;

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(ILogger)
    private readonly logger: ILogger;

    canHandle(uri: URI): number {
        try {
            const lowercaseExtension = uri.path.ext.toLocaleLowerCase();
            if (lowercaseExtension == ".rmd" || lowercaseExtension == ".r") {
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
        // todo handle nonworkspace file
        const workspace = this.workspaceService.getWorkspaceRootUri(uri);
        if (!workspace) {
            return this.fallback(uri);
        }

        const relativeFilePath = workspace.relative(uri)
        if (!relativeFilePath) {
            return this.fallback(uri);
        }

        const instance = (await this.serverProxyInstanceManager.getInstancesByType(Extension.ID))[0];

        if (!instance) {
            this.logger.info("RStudio not running");
            return this.fallback(uri);
        }

        const { clientId, clientVersion, csrfToken } = (await this.serverProxyRpcServer.getTemp()).find(t => !!t.details).details;

        if (!clientId || !clientVersion || !csrfToken) {
            this.logger.info("No clientId/clientVersion/csrfToken")
            return this.fallback(uri);
        }

        const widget = await this.widgetManager.getWidget(
            ServerProxyWidget.ID,
            {
                serverProxyInstanceId: instance.id
            }
        )

        if (!widget) {
            this.logger.info("Couldn't find widget");
            return this.fallback(uri);
        }

        const activatePromise = this.app.shell.activateWidget(widget.id);

        const data = JSON.stringify({
            clientId,
            clientVersion,
            method: "console_input",
            // TODO: needs escaping
            params: [`rstudioapi::navigateToFile("${uri.path.toString()}")`, "", 0],
        });

        let resolve: ((_: any) => void) | undefined = undefined;
        const promise = new Promise((r) => {
            resolve = r;
        });

        const request = http.request({
            hostname: 'localhost',
            port: 3000,
            method: 'POST',
            path: `/server-proxy/${Extension.ID}/${instance.id}/rpc/console_input`,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                'X-CSRF-Token': csrfToken
            }
        }, res => {
            res.on('end', () => {
                resolve?.(true);
            })
        });

        request.write(data);
        request.end();

        await promise;
        await activatePromise;
    }

}
