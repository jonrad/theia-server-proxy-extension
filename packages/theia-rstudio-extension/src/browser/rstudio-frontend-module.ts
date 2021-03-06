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

import { ContainerModule, interfaces } from 'inversify';
import { CommandContribution } from '@theia/core';
import { RstudioCommandContribution } from './rstudio-command-contribution';
import { RStudioServerProxyOpenHandler } from './rstudio-server-proxy-open-handler';
import { TabBarToolbarContribution } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { OpenHandler } from '@theia/core/lib/browser';
import { RStudioOpenHandler } from './rstudio-open-handler';

export default new ContainerModule((bind: interfaces.Bind) => {
    bind(RstudioCommandContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(RstudioCommandContribution);
    bind(TabBarToolbarContribution).toService(RstudioCommandContribution);

    bind(OpenHandler).to(RStudioServerProxyOpenHandler);
    bind(OpenHandler).to(RStudioOpenHandler);
});
