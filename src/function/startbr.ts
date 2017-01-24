`use strict`;

import * as vscode from 'vscode';
import * as path from 'path';

import * as sysmsg from '../msg/message';
import * as cli from '../client/client';
import * as ext from '../extension';
import * as urlUtil from '../util/urlUtil';
import * as cmnUtil from '../util/commonUtil';
import * as pftUtil from '../util/platformUtil';
import { updateSingleRepoStatus } from '../function/status';
import { updateSingleRepoInfo } from '../function/info';
import { checkConfiguratoin } from '../function/config';

export function activate(context: vscode.ExtensionContext) {

    let disposable = vscode.commands.registerCommand('repotool-cmd:startbranch', (fileUri?: vscode.Uri) => {
        console.log(fileUri.toString());
        if (!checkConfiguratoin()) return;


        let filePath = (pftUtil.isLinux()) ? fileUri.fsPath : cmnUtil.composeLinuxPath(fileUri.fsPath);
        let dirPath = path.dirname(filePath);

        vscode.window.showInputBox({ placeHolder: sysmsg.HINT_INPUT_BRANCH_NAME }).then((branch: string) => {
            if (!branch) return;
            cli.getInstance().doRepoStart(dirPath, branch, false).then(
                (msgs: string[]) => {
                    updateSingleRepoStatus(dirPath);
                    updateSingleRepoInfo(dirPath);
                    vscode.window.showInformationMessage(`Local branch[${branch}] was created successfully!`);
                },
                (reason: string) => {
                    vscode.window.showErrorMessage(`Fail to create local branch[${branch}]: ${reason}`);
                }
            );
        });
    });

    context.subscriptions.push(disposable);
}