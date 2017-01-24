'use strict';

import * as vscode from 'vscode';
import * as util from 'util';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

import * as ext from '../extension';
import * as cli from './client';
import * as cmnUtil from '../util/commonUtil';
import * as cfg from '../function/config';
import * as constant from '../util/const';

export class LinuxClient implements cli.CommandClient {

    private repoTool: string;
    private git: string;

    public constructor() {
        this.repoTool = ext.Global.config.repotool.path;
        this.git = ext.Global.config.git.path;
    }

    private localExe(cmd: string, stdin?: string): Thenable<string[]> {
        return new Promise((resolve, reject) => {
            let msg: string = "", errMsg: string = "";
            let child = cp.exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (error: Error, stdout: string, stderr: string) => {
                msg = stdout;
                errMsg = stderr;
                if (error) {
                    cmnUtil.showConsoleMessage(`${error.stack}`, true);
                    reject([stdout, stderr]);
                } else {
                    resolve([stdout, stderr]);
                }
            }).on('exit', (code: number) => {
                if (code) {
                    cmnUtil.showConsoleMessage(`failt to execute ${cmd}: ${errMsg}`, true);
                } else {
                    cmnUtil.showConsoleMessage(`Success: ${cmd}`);
                }
            });

            if (stdin) {
                child.stdin.write(stdin);
            }

        });
    }

    checkPath(workDir: string, options?: string): Thenable<string[]> {
        let cmd = `readlink ${options} ${workDir}`;
        return this.localExe(cmd);
    }


    getDirSize(dir: string, option: string): Thenable<string[]> {
        let cmd = `du ${option || "--max-depth=0 "} ${dir}`
        return this.localExe(cmd);
    };

    doGitLog(workDir: string, options: string): Thenable<string[]> {
        let cmd = `cd ${workDir} && ${this.git} log ${options}`;
        return this.localExe(cmd);
    }

    doBatchUplaod(projs: string[], data: {},
        checkStatus: (mountPath: string, allDone: boolean[]) => void) {

        var allDone = projs.map((x) => { return null });

        projs.forEach((val, idx) => {
                        
            let key = cmnUtil.getProjRealPath(val);
            let mountPath: string = ext.Global.codebaseInfo[key]['mount-path'];
            let realProj: string = ext.Global.codebaseInfo[key]['project'];
            let amend: boolean = data[val]["isAmendToggled"];
            let msg: string = "", errMsg: string = "";

            let cmd: string = `cd ${mountPath} && ${this.git} add . `;
            let informer: NodeJS.Timer = setInterval(() => {
                cmnUtil.showMessage(ext.Global.repoChannel, `[${idx}] uploading ${val}.. please be patient...`);
            }, 2500);

            let errHandling = (idx) => {
                clearInterval(informer);
                allDone[idx] = false;
            };

            let child = cp.exec(cmd, (error: Error, stdout: string, stderr: string) => {
                if (error) {
                    cmnUtil.showConsoleMessage(`${stderr}\n${error.stack}`, true);
                }
                errMsg = stderr;
                msg = stdout;
            }).on('exit', (code: number) => {
                if (code) {
                    errHandling(idx);
                    checkStatus(mountPath, allDone);
                    cmnUtil.showConsoleMessage(errMsg, true);
                } else {
                    cmnUtil.showConsoleMessage(`Success: ${cmd}`);
                    cmd = `cd ${mountPath} && ${this.git} commit ${(amend) ? "--amend" : ""} -m '${data[val][constant.message]}' `;
                    let child = cp.exec(cmd, (error: Error, stdout: string, stderr: string) => {
                        if (error) {
                            cmnUtil.showConsoleMessage(`${stderr}\n${error.stack}`, true);
                        }
                        errMsg = stderr;
                        msg = stdout;
                    }).on('exit', (code) => {
                        if (code) {
                            errHandling(idx);
                            checkStatus(mountPath, allDone);
                        } else {
                            cmnUtil.showConsoleMessage(`Success: ${cmd}`);
                            let draftOrNot: string = (ext.Global.config.repotool.uploadType == "DRAFT") ? "--draft" : "";
                            errMsg = "";
                            cmd = `cd ${mountPath} && ${this.repoTool} upload ${draftOrNot} --dest=${data[val][constant.remoteBranch]} --br=${data[val][constant.localBranch]} ${realProj}`;
                            let child = cp.exec(cmd, (error: Error, stdout: string, stderr: string) => {
                                if (error) {
                                    cmnUtil.showConsoleMessage(`${stderr}\n${error.stack}`, true);
                                } else {
                                    cmnUtil.showConsoleMessage(`Success: ${cmd}: \n${stdout}\n${(stderr) ? `stderr:\n${stderr}` : ""}`);
                                }
                                errMsg = stderr;
                                msg = stdout;
                            }).on('exit', (code: number) => {
                                clearInterval(informer);
                                if (code) {
                                    cmnUtil.showConsoleMessage(`Fail to upload: ${cmd}`, true);
                                    allDone[idx] = false;
                                    if (amend) {
                                        cmnUtil.showConsoleMessage(`skip reset codebase because commit with amend.`);
                                        checkStatus(mountPath, allDone);
                                    } else {
                                        cmd = `cd ${mountPath} && ${this.git} reset --mixed HEAD^ `;
                                        let child = cp.exec(cmd, (error: Error, stdout: string, stderr: string) => {
                                            if (error) {
                                                cmnUtil.showConsoleMessage(`${stderr}\n${error.stack}`, true);
                                            }
                                            errMsg = stderr;
                                            msg = stdout;
                                        }).on('exit', (code: number) => {
                                            if (code) {
                                                cmnUtil.showConsoleMessage(`Fail to reset codebase`, true);
                                            } else {
                                                cmnUtil.showConsoleMessage(`Success: ${cmd}`);
                                            }
                                            checkStatus(mountPath, allDone);
                                        });
                                    };

                                } else {
                                    allDone[idx] = true;
                                    checkStatus(mountPath, allDone);
                                }
                            });
                            child.stdin.write(`y\nno\n`);
                        }

                    });
                }
            });
        });

    }

    doRepoInfo(workDir, curDir: boolean = false): Thenable<string[]> {
        let cmd = `cd ${workDir} && ${this.repoTool} info ${(curDir) ? "." : ""}`;
        return this.localExe(cmd);
    }

    doRepoStatus(workDir,
        thread: number = 24,
        curDir: boolean = false): Thenable<string[]> {
        let cmd = `cd ${workDir} && ${(curDir) ? "" : ""} ${this.repoTool} status -j ${thread} ${(curDir) ? "." : ""}`;
        return this.localExe(cmd);
    }

    doRepoSync(workDir, thread: number = 24): Thenable<string[]> {
        let cmd = `pwd && cd ${workDir} &&  ${this.repoTool} sync -j 24 -f -c --no-tags --optimized-fetch --force-sync >sync.log`;
        return this.localExe(cmd);
    }

    doRepoInit(workDir, options: string): Thenable<string[]> {
        let cmd = `mkdir -p ${workDir} && cd ${workDir} &&  ${this.repoTool} init ${options}`;
        return this.localExe(cmd);
    }

    doRepoUpload(workDir: string, stdin: string, projects: string[], srcBr: string, destBr: string): Thenable<string[]> {
        let projStr = ""
        projects.forEach((v) => {
            projStr += `${v} `;
        });
        return this.localExe(`cd ${workDir} && ${this.repoTool} upload --dest=${destBr} --br=${srcBr} ${projStr}`, stdin);
    }

    doRepoStart(workDir: string, branch: string, all: boolean = false, ): Thenable<string[]> {
        let cmd = `cd ${workDir} && ${this.repoTool} start ${branch} ${(all) ? "--all" : ""} .`;
        return this.localExe(cmd);
    }

    doGitCommit(workDir: string, message: string): Thenable<string[]> {
        let cmd = `cd ${workDir} && ${this.git} commit -m '${message}' `;
        return this.localExe(cmd);
    }

    doGitAdd(workDir: string, filePath: string): Thenable<string[]> {
        let cmd = `cd ${workDir} && ${this.git} add ${filePath}`;
        return this.localExe(cmd);
    }

    doGitPush(workDir: string, remote: string, srcBr: string, destBr: string): Thenable<string[]> {
        let cmd = `cd ${workDir} && ${this.git} push ${remote} ${srcBr}:refs/for/${destBr} `;
        return this.localExe(cmd);
    }

    doGitReset(workDir: string, ref: string, mode: string): Thenable<string[]> {
        let cmd = `cd ${workDir} && ${this.git} reset ${mode} ${ref} `;
        return this.localExe(cmd);
    }

}