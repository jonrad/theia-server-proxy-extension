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

import { ViewContributionOptions } from "@theia/core/lib/browser";
import { AbstractViewContribution, FrontendApplicationContribution } from "@theia/core/lib/browser";
import { PROBLEM_KIND } from "@theia/markers/lib/common/problem-marker";
import { ServerProxyListWidget } from "./server-proxy-list-widget";

const ServerProxyListCommand = {
    id: ServerProxyListWidget.ID,
    label: ServerProxyListWidget.LABEL
};

export class ServerProxyListViewContribution extends AbstractViewContribution<ServerProxyListWidget> implements FrontendApplicationContribution {
    constructor() {
        const options: ViewContributionOptions = {
            widgetId: ServerProxyListWidget.ID,
            widgetName: ServerProxyListWidget.LABEL,
            defaultWidgetOptions: {
                area: 'bottom',
                rank: 200,
            },
            toggleCommandId: ServerProxyListCommand.id
        };

        super(options);
    }

    async initializeLayout(): Promise<void> {
        const problemsWidget = await this.widgetManager.getWidget(PROBLEM_KIND);
        const ref = problemsWidget;
        await this.openView({
            mode: "tab-after",
            ref
        });
    }
}
