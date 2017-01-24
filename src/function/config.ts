'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import * as sjc from 'strip-json-comments';

import * as cli from '../client/client';
import * as ext from '../extension';
import { ConfigView } from '../comp/configView';
import * as uriUtil from '../util/urlUtil';
import * as comUtil from '../util/commonUtil';
import * as pfUtil from '../util/platformUtil';
import * as constant from '../util/const';
import * as msg from '../msg/message';

let cfgProvider: ConfigView = null;
let pageId: string = "";

// let config = {
//     "workspace": {
//         linuxPath: ""
//     },
//     "ssh": {
//         "host": "",
//         "port": 22,
//         "user": "",
//         "pwd": ""
//     },
//     "repotool": {
//         "path": "",
//         "uploadType": ""
//         "initOption" :　""
//         "syncOption" : ""
//     },
//     "git": {
//         "path": ""
//     },
//     "manifest": {
//         "type": []
//     }
// };
export function checkConfiguratoin(showPage: boolean = true): boolean {
    let result: boolean = true;
    let cfg = ext.Global.config;
    if (!cfg.workspace.linuxPath) {
        vscode.window.showWarningMessage(msg.WARN_PLEASE_SETUP_LINUX_PATH);
        result = false;
    }

    // only need to check if windows
    if (pfUtil.isWindows()) {
        if (!cfg.ssh || !cfg.ssh.user || !cfg.ssh.pwd || !cfg.ssh.port || !cfg.ssh.host) {
            vscode.window.showWarningMessage(msg.WARN_PLEASE_SETUP_SSH_SETTING);
            result = false;
        }

        if (ext.Global.config && (!ext.Global.config.workspace || !ext.Global.config.workspace.linuxPath)) {
            result = false;
            comUtil.showErrorMessage(`Current workspace is ${vscode.workspace.rootPath}, configured mapped linux path is ${ext.Global.config.workspace.linuxPath}`,
                msg.ERR_SETUP_PATH_FIRST);
        }
    }

    if (!result && showPage)
        cfgProvider.navigate(pageId);

    return result;
}

export function activate(context: vscode.ExtensionContext) {

    cfgProvider = new ConfigView(context);
    let registration = vscode.workspace.registerTextDocumentContentProvider(cfgProvider.scheme, cfgProvider);

    let cfg = vscode.commands.registerCommand(constant.cmd.config, (uri: vscode.Uri, id: string) => {
        pageId = uriUtil.getId();
        cfgProvider.navigate(pageId);
    });

    vscode.workspace.onDidChangeConfiguration((e: void) => {
        ext.Global.config = comUtil.loadConfig();
        console.log(JSON.stringify(ext.Global.config, null, 2));
    });

    let cfgSubmit = vscode.commands.registerCommand(constant.cmd.configSubmit, (systemCfg: any) => {

        comUtil.closeCurActivateDoc();
        ext.Global.config = systemCfg;
        comUtil.saveConfig(ext.Global.config);

        if (systemCfg.workspace.linuxPath) {
            var pth = comUtil.tailWithSlash(systemCfg.workspace.linuxPath);
            cli.getInstance().checkPath(pth, "-f").then(
                (msg: string[]) => {
                    if (msg[0]) {
                        ext.Global.realpath = msg[0].replace('\n', '');
                    } else {
                        comUtil.showErrorMessage(`Fail to check mapping path: ${msg}`);
                    }
                },
                (reason) => {
                    comUtil.showErrorMessage(`Fail to check mapping path: ${reason}`);
                }
            )
        }
    });

    context.subscriptions.push(cfgProvider, registration, cfg, cfgSubmit);
}