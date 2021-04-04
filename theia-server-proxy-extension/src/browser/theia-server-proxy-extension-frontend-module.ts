/**
 * Generated using theia-extension-generator
 */
import { TheiaServerProxyExtensionCommandContribution, TheiaServerProxyExtensionMenuContribution } from './theia-server-proxy-extension-contribution';
import {
    CommandContribution,
    MenuContribution
} from "@theia/core/lib/common";
import { ContainerModule } from "inversify";

export default new ContainerModule(bind => {
    // add your contribution bindings here
    bind(CommandContribution).to(TheiaServerProxyExtensionCommandContribution);
    bind(MenuContribution).to(TheiaServerProxyExtensionMenuContribution);
});
