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

import { injectable, inject, named, postConstruct } from 'inversify';
import { ContributionProvider } from "@theia/core/lib/common";
import { Options, RequestHandler } from "http-proxy-middleware";

export interface ServerProxyCommandContext {
    relativeUrl: string;
    port: number;
    workspacePath: string;
}

export const ServerProxyContribution = Symbol('ServerProxyContribution');
export interface ServerProxyContribution {
    readonly id: string;

    readonly name: string;

    getCommand(context: ServerProxyCommandContext): string[]

    getMiddleware?(basePath: string, baseOptions: Options): RequestHandler
}

@injectable()
export class ServerProxyManager {
    private contributionsById: Map<string, ServerProxyContribution> = new Map<string, ServerProxyContribution>();

    @inject(ContributionProvider) @named(ServerProxyContribution)
    protected readonly contributionProvider: ContributionProvider<ServerProxyContribution>

    @postConstruct()
    async init() {
        this
            .contributionProvider
            .getContributions()
            .forEach(c => this.contributionsById.set(c.id, c))
    }

    getById(id: string): ServerProxyContribution | undefined {
        return this.contributionsById.get(id);
    }

    get(): ServerProxyContribution[] {
        return this
            .contributionProvider
            .getContributions()
    }
}
