'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import * as getCode from './function/getcode';
import * as showInfo from './function/info';
import * as showStatus from './function/status';
import * as upload from './function/upload';
import * as start from './function/startbr';
import * as pfutil from './util/platformUtil';
import * as cfgController from './function/config';
import * as cmnUtil from './util/commonUtil';
import * as cli from './client/client';

export class Global {
    static codebaseStatus = new Map();
    static codebaseInfo = {};
    static statusRefresh = false;
    static infoRefresh = false;
    static versionRefresh = true;
    static verions = {};
    static config: any = {};
    static realpath: string = ""; // to handle softlink
    static isSingleRepoWs: boolean = true;
    static repoChannel = vscode.window.createOutputChannel('Repo tool');
}

export function activate(context: vscode.ExtensionContext) {
    try {

        Global.config = cmnUtil.loadConfig();

        if (vscode.workspace.rootPath && // directly opening vscode will be an empty worksapce
            fs.existsSync(path.join(vscode.workspace.rootPath, ".repo"))) {
            Global.isSingleRepoWs = false;
        }

        cfgController.activate(context);
        getCode.activate(context);
        showInfo.activate(context);
        showStatus.activate(context);
        upload.activate(context);
        start.activate(context);

        if (Global.config.workspace && Global.config.workspace.linuxPath) {
            var pth = cmnUtil.tailWithSlash(Global.config.workspace.linuxPath);
            cli.getInstance() && cli.getInstance().checkPath(pth, "-f").then(
                (msg: string[]) => {
                    if (msg[0]) {
                        Global.realpath = msg[0].replace('\n', '');
                    } else {
                        cmnUtil.showErrorMessage(`Fail to check mapping path: ${msg}`);
                    }
                },
                (reason) => {
                    cmnUtil.showErrorMessage(`Fail to check mapping path: ${reason}`);
                }
            )
        }
    } catch (error) {
        cmnUtil.showErrorMessage(error.stack, error);
    }
}

export function deactivate() {
}