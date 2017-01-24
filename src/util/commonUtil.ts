'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import * as sjc from 'strip-json-comments';

import * as pfUtil from './platformUtil';
import * as urlUtil from './urlUtil';
import * as ext from '../extension';

export function showMessage(chal: vscode.OutputChannel, msg: string, show?: boolean, alert?: string) {
    if (show) chal.show();
    if (alert) vscode.window.showErrorMessage(alert);
    chal.appendLine(`${getCurTimeString()} ${msg}`);
}

export function showLogMsg(msg: string, show?: boolean, level?: string, title?: string) {
    if (show) ext.Global.repoChannel.show();
    ext.Global.repoChannel.appendLine(`${getCurTimeString()} ${msg}`);

    if (level) {
        if (level.toLowerCase() == "error" && title) {
            vscode.window.showErrorMessage(title);
        } else if (level.toLowerCase() == "warn" && title) {
            vscode.window.showWarningMessage(title);
        } else if (level.toLowerCase() == "info" && title) {
            vscode.window.showInformationMessage(title);
        }
    }
}

export function showWarnMessage(msg: string, title?: string) {
    showLogMsg(msg, true, "warn", title);
}

export function showErrorMessage(msg: string, title?: string) {
    showLogMsg(msg, true, "error", title);
}

export function showConsoleMessage(msg: string, show?: boolean) {
    console.log(`${getCurTimeString()} ${msg}`);
    if (show != undefined) {
        showLogMsg(msg, show);
    }
}

export function getCurTimeString() {
    return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

export function getObjectKey(obj: any): any[] {
    let keys = [];
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            keys.push(prop);
        }
    }
    return keys
}

export function deepCopy(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
}

export function closeCurActivateDoc() {
    try {
        let curFile = vscode.window.activeTextEditor.document.fileName;

    } catch (e) {
        if (e instanceof TypeError) {
            vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        } else {
            console.error(e);
        }
    }
}

export function loadConfig() {

    try {
        let config = {
            "workspace": {
                linuxPath: ""
            },
            "ssh": {
                "host": "",
                "port": 22,
                "user": "",
                "pwd": ""
            },
            "repotool": {
                "path": "",
                "uploadType": "",
                "initOption": "",
                "syncOption": ""
            },
            "git": {
                "path": ""
            },
            "manifest": {
                "type": []
            }
        };
        let cfg = vscode.workspace.getConfiguration("repotoolgui");
        config.ssh.host = <string>cfg.get("ssh.host");
        config.ssh.port = <number>cfg.get("ssh.port");
        config.ssh.user = <string>cfg.get("ssh.user");
        config.ssh.pwd = <string>cfg.get("ssh.pwd");

        config.git.path = (cfg.get("git.path")) ? <string>cfg.get("git.path") : "git";

        config.repotool.path = (cfg.get("repotool.path")) ? <string>cfg.get("repotool.path") : "repo";
        config.repotool.uploadType = (cfg.get("repotool.uploadType")) ? <string>cfg.get("repotool.uploadType") : "DRAFT";
        config.repotool.initOption = <string>cfg.get("repotool.initOption") || 
            "-u https://android.googlesource.com/platform/manifest ";
        config.repotool.syncOption = <string>cfg.get("repotool.syncOption") || " -f --force-sync --no-tags -c -q -j 24 --prune --optimized-fetch ";

        config.workspace.linuxPath = (pfUtil.isLinux()) ? vscode.workspace.rootPath :
            <string>cfg.get("workspace.linuxPath");
        config.manifest.type = (cfg.get("manifest.type")) ? <string[]>cfg.get("manifest.type") : ["HQ", "ONE", "SUB"];

        return config;

    } catch (error) {
        throw new Error("Fail to load configuration:" + error);
    }

}

export function saveConfig(config: any) {
    try {
        // the settign file doesn't exist at the first launch after installing vscode
        let f = pfUtil.getUserSettingPath();
        let userSetting = (fs.existsSync(f)) ? sjc(fs.readFileSync(f).toString()) : "{}";
        userSetting = JSON.parse(userSetting);
        userSetting["repotoolgui"] = config;
        var data = JSON.stringify(userSetting, null, 2);
        console.log(data);
        fs.writeFileSync(pfUtil.getUserSettingPath(), data);

        vscode.window.showInformationMessage("Repotool GUI Configuration saved successfully!");
    } catch (error) {
        console.error(error);
        vscode.window.showErrorMessage(`Fail to save configuration: ${error}`);
    }
}


export function tailWithSlash(pth: string): string {
    let tmp = (' ' + pth).slice(1);
    if (!tmp.endsWith("/")) {
        tmp += "/";
    }
    return tmp;
}

export function getProjRealPath(proj: string): string {
    var keys = getObjectKey(ext.Global.codebaseInfo);
    for (var i = 0; i < keys.length; i++) {
        let projPath = <string>keys[i];
        if (projPath.endsWith(proj) || projPath.endsWith(proj.substr(0, proj.length - 1))) {
            return projPath;
        }
    }
    throw new Error(`Fail to find real path of project:${proj} in codebase!`);
}


export function getProjWorkspacePath(proj: string): string {
    let projToken = proj.split(path.posix.sep).filter((x) => { return x; });
    let pthToekn = urlUtil.diff(vscode.workspace.rootPath.split(path.sep), projToken);
    pthToekn = pthToekn.concat(projToken);
    return (pfUtil.isLinux()) ? `${path.sep}${pthToekn.join(path.sep)}` : `${pthToekn.join(path.sep)}`;
}

export function composeLinuxPath(winPath: string): string {
    let delimit = "\\";
    let fileToken = winPath.split(delimit);
    let workDirToken = vscode.workspace.rootPath.split(delimit);
    let projToken = urlUtil.diff(fileToken, workDirToken);
    projToken.splice(0, 0, ext.Global.realpath);

    let linuxFile = path.posix.join.apply(this, projToken);
    let linuxWorkingDir = path.posix.dirname(linuxFile);

    return linuxFile;
}