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
import { ILogger } from '@theia/core';
import { inject, injectable } from 'inversify';
import { OpenHandler, OpenerService } from '@theia/core/lib/browser';
import { ServerProxyInstanceManager } from 'theia-server-proxy-extension/lib/browser/server-proxy-instance-manager';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { Extension } from '../common/const';
import { ServerProxyOpenHandler } from 'theia-server-proxy-extension/lib/browser/server-proxy-open-handler';

@injectable()
export class RStudioOpenHandler implements OpenHandler {

    readonly id = 'rstudio.openhandler';
    readonly label = 'Open in RStudio';

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(ServerProxyInstanceManager)
    protected readonly serverProxyInstanceManager: ServerProxyInstanceManager;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(ILogger)
    private readonly logger: ILogger;

    canHandle(uri: URI): number {
        try {
            const lowercaseExtension = uri.path.ext.toLocaleLowerCase();
            if (lowercaseExtension == ".rmd" || lowercaseExtension == ".r") {
                return 500;
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

        const instance = await this.serverProxyInstanceManager.getOrCreateInstance(Extension.ServerProxy, {});

        if (!instance) {
            this.logger.warn("RStudio instance did not start properly");
            return this.fallback(uri);
        }

        const widget = await ServerProxyOpenHandler.open(
            this.openerService,
            instance
        );

        if (!widget) {
            this.logger.warn("RStudio widget did not open");
            return this.fallback(uri);
        }

        const data = JSON.stringify({
            method: "console_input",
            //TODO: is this the proper escaping
            params: [`rstudioapi::navigateToFile("${uri.path.toString().replace('"', '\\"')}")`, "", 0],
        });

        await fetch(`/server-proxy/${Extension.ID}/${instance.id}/rpc/theia_remote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length.toString(),
            },
            body: data
        });
    }
}
