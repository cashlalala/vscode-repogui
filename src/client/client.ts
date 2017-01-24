'use strict';

import * as vscode from 'vscode';
import * as pfutil from '../util/platformUtil';
import * as winClint from './windows';
import * as linuxClint from './linux';
import * as cfg from '../function/config';

let currentCli = null;

export function getInstance(): CommandClient {
    if (!currentCli) {
        if (!cfg.checkConfiguratoin(false)) return currentCli;
        // platform check
        if (pfutil.isLinux()) {
            currentCli = new linuxClint.LinuxClient();
        } else if (pfutil.isWindows()) {
            currentCli = new winClint.WindowsClient();
        } else {
            throw new Error("Unsupported platform!");
        }
    }
    return currentCli;
}

export interface CommandClient {

    checkPath(workDir: string, options?: string): Thenable<string[]>;

    doGitLog(workDir: string, options: string): Thenable<string[]>;

    doBatchUplaod(projs: string[], data: {},
        checkStatus: (mountPath: string, allDone: boolean[]) => void);

    doRepoUpload(
        workDir: string,
        stdin: string,
        projects: string[], srcBr: string, destBr: string)
        : Thenable<string[]>;

    doRepoStart(
        workDir: string,
        branch: string,
        all: boolean)
        : Thenable<string[]>;

    doGitCommit(
        workDir: string,
        message: string)
        : Thenable<string[]>;

    doGitAdd(
        workDir: string,
        filePath: string)
        : Thenable<string[]>;

    doGitPush(
        workDir: string,
        remote: string,
        srcBr: string,
        destBr: string)
        : Thenable<string[]>;

    doGitReset(
        workDir: string,
        ref: string,
        mode: string)
        : Thenable<string[]>;

    doRepoStatus(workDir,
        thread?: number,
        curDir?: boolean): Thenable<string[]>;

    doRepoInfo(workDir,
        curDir: boolean): Thenable<string[]>;

    doRepoSync(workDir, thread: number): Thenable<string[]>;

    doRepoInit(workDir, options: string): Thenable<string[]>;

    getDirSize(dir: string, option: string): Thenable<string[]>;

}
