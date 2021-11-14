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
import { MlFlowUiCommandContribution } from './mlflow-ui-command-contribution';
import { MlFlowUiOpenHandler } from './mlflow-ui-open-handler';
import { OpenHandler } from '@theia/core/lib/browser';
import { MlFlowUiFileOpenHandler } from './mlflow-ui-file-open-handler';

export default new ContainerModule((bind: interfaces.Bind) => {
    bind(MlFlowUiCommandContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(MlFlowUiCommandContribution);

    bind(OpenHandler).to(MlFlowUiFileOpenHandler);

    bind(OpenHandler).to(MlFlowUiOpenHandler);
});
