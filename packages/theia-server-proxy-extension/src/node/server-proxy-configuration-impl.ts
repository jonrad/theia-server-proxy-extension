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
import { CliContribution } from '@theia/core/lib/node';
import { injectable } from '@theia/core/shared/inversify';
import { ServerProxyConfiguration } from '../common/server-proxy-configuration';
import * as yargs from 'yargs';
import { MaybePromise } from '@theia/core';

const ARG_THEIA_HOME_PATH = 'theia-home-path';

@injectable()
export class ServerProxyConfigurationImpl implements CliContribution, ServerProxyConfiguration {
    private theiaHomePath: string;

    public getTheiaHomePath(): MaybePromise<string> {
        return this.theiaHomePath;
    }

    public configure(conf: yargs.Argv): void {
        conf.option(ARG_THEIA_HOME_PATH, { description: 'Root path where theia is served', type: 'string', default: '' });
    }

    public async setArguments(args: yargs.Arguments): Promise<void> {
        this.theiaHomePath = args[ARG_THEIA_HOME_PATH] as string;
    }
}
