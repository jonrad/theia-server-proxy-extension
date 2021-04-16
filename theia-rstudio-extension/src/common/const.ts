/********************************************************************************
<<<<<<< HEAD
 * Copyright (C) 2021 Jon Radchenko and others.
=======
 * Copyright (C) 2018 Red Hat, Inc. and others.
>>>>>>> 722a8df (Init)
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

import { ServerProxy } from "theia-server-proxy-extension/lib/common/server-proxy";

export namespace Extension {
    export const ID = 'rstudio';

    export const Name = 'RStudio';

    export const ServerProxy: ServerProxy = {
        id: ID,
        name: Name
    }
}
