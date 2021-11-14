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
import { OpenHandler, OpenerService } from '@theia/core/lib/browser';
import { ServerProxyInstanceManager } from 'theia-server-proxy-extension/lib/browser/server-proxy-instance-manager';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { Extension } from '../common/const';
import { ServerProxyOpenHandler } from 'theia-server-proxy-extension/lib/browser/server-proxy-open-handler';

@injectable()
export class MlFlowUiFileOpenHandler implements OpenHandler {

    readonly id = 'mlflow.ui.file.openhandler';
    readonly label = 'MlFlow';

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(ServerProxyInstanceManager)
    protected readonly serverProxyInstanceManager: ServerProxyInstanceManager;

    @inject(ServerProxyOpenHandler)
    protected readonly serverProxyOpenHandler: ServerProxyOpenHandler;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    canHandle(uri: URI): number {
        try {
            if (uri.path.name == "mlruns" && uri.path.ext == "") {
                return 500;
            }

            return 0;
        } catch {
            return 0;
        }
    }

    async open(uri: URI): Promise<object | undefined> {
        const instance = await this.serverProxyInstanceManager.getOrCreateInstance(Extension.ServerProxy, {
            backendStoreUri: `file://${uri.path.toString()}`
        });

        return await this.serverProxyOpenHandler.openInstance(
            instance
        )
    }
}
