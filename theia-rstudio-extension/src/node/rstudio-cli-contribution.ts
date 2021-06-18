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
import * as yargs from 'yargs';

const ARG_RSTUDIO_VERSION = 'rstudio-old-version';

@injectable()
export class RStudioCliContribution implements CliContribution {
    public rstudioOldVersion: boolean;

    public isOldRStudio(): boolean {
        return this.rstudioOldVersion;
    }

    public isNewRStudio(): boolean {
        return !this.isOldRStudio();
    }

    public configure(conf: yargs.Argv): void {
        conf.option(ARG_RSTUDIO_VERSION, { description: 'Old RStudio Version', type: 'boolean', default: false });
    }

    public async setArguments(args: yargs.Arguments): Promise<void> {
        this.rstudioOldVersion = args[ARG_RSTUDIO_VERSION] as boolean;
    }
}
