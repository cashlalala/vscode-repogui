'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { exec } from 'child_process';

import * as ssh from 'ssh2';

import * as ext from '../extension';
import * as cli from './client';
import * as cmnUtil from '../util/commonUtil';
import * as constant from '../util/const';
import * as urlUtil from '../util/urlUtil';

class SshConfg implements ssh.ConnectConfig {
}

export class WindowsClient implements cli.CommandClient {

    private cfg: ssh.ConnectConfig;
    private repoTool: string;
    private git: string;

    public constructor() {
        this.cfg = new SshConfg();
        this.cfg.host = ext.Global.config.ssh.host;
        this.cfg.port = ext.Global.config.ssh.port;
        this.cfg.username = ext.Global.config.ssh.user;
        this.cfg.password = ext.Global.config.ssh.pwd;
        this.repoTool = ext.Global.config.repotool.path;
        this.git = ext.Global.config.git.path;
    }

    getDirSize(dir: string, option: string): Thenable<string[]> {
        let cmd = `du ${option || "--max-depth=0 "} ${dir}`
        return this.sshExe(cmd);
    };

    doGitLog(workDir: string, options: string): Thenable<string[]> {
        let cmd = `cd ${workDir} && ${this.git} log ${options}`;
        return this.sshExe(cmd);
    }

    checkPath(workDir: string, options?: string): Thenable<string[]> {
        let cmd = `readlink ${options} ${workDir}`;
        return this.sshExe(cmd);
    }

    doBatchUplaod(projs: string[], data: {},
        checkStatus: (mountPath: string, allDone: boolean[]) => void) {

        var allDone = projs.map((x) => { return null });
        let curPathToken = ext.Global.realpath.split('/');

        var cli = new ssh.Client();
        cli.connect(this.cfg);
        cli.on("ready", () => {
            projs.forEach((val, idx) => {
                let key = cmnUtil.getProjRealPath(val);
                let mountPath: string = ext.Global.codebaseInfo[key]['mount-path'];
                let realProj: string = ext.Global.codebaseInfo[key]['project'];
                let msg: string = "";
                let errMsg: string = "";
                let amend: boolean = data[val]["isAmendToggled"];

                let cmd: string = `cd ${mountPath} && ${this.git} add . `;
                let informer: NodeJS.Timer = setInterval(() => {
                    cmnUtil.showMessage(ext.Global.repoChannel, `[${idx}] uploading ${val}.. please be patient...`);
                }, 2500);

                let errHandling = (idx) => {
                    clearInterval(informer);
                    allDone[idx] = false;
                };

                cli.exec(cmd, (err: Error, stream: ssh.ClientChannel) => {
                    if (err) {
                        errHandling(idx);
                        checkStatus(mountPath, allDone);
                        cmnUtil.showConsoleMessage(err.stack, true);
                    }

                    stream.on('close', (code, signal) => {
                        if (code == 0) {
                            cmnUtil.showConsoleMessage(`Success: ${cmd}`);

                            cmd = `cd ${mountPath} && ${this.git} commit ${(amend) ? "--amend" : ""} -m '${data[val][constant.message]}' `;
                            cli.exec(cmd, (err: Error, stream: ssh.ClientChannel) => {
                                if (err) {
                                    errHandling(idx);
                                    checkStatus(mountPath, allDone);
                                    cmnUtil.showConsoleMessage(err.stack, true);
                                }

                                stream.on('close', (code, signal) => {
                                    if (code == 0) {
                                        cmnUtil.showConsoleMessage(`Success: ${cmd}`, true);
                                        let draftOrNot: string = (ext.Global.config.repotool.uploadType == "DRAFT") ? "--draft" : "";
                                        cmd = `cd ${mountPath} && ${this.repoTool} upload ${draftOrNot} --dest=${data[val][constant.remoteBranch]} --br=${data[val][constant.localBranch]} ${realProj}`;

                                        cli.exec(cmd, (err: Error, stream: ssh.ClientChannel) => {
                                            if (err) {
                                                errHandling(idx);
                                                checkStatus(mountPath, allDone);
                                                cmnUtil.showConsoleMessage(err.stack, true);
                                            }

                                            stream.write(`y\nno\n`);

                                            stream.on('close', (code, signal) => {
                                                clearInterval(informer);
                                                if (code == 0 && errMsg.indexOf(`no branches ready for upload`) < 0) {
                                                    cmnUtil.showConsoleMessage(`Success: ${cmd}`);
                                                    allDone[idx] = true;
                                                    checkStatus(mountPath, allDone);

                                                } else {
                                                    cmnUtil.showConsoleMessage(`Fail: ${cmd}\ncode: [${code}]\nmessage:${msg}\n${errMsg}`, true);
                                                    allDone[idx] = false;

                                                    if (amend) {
                                                        cmnUtil.showConsoleMessage(`skip reset codebase because commit with amend.`);
                                                        checkStatus(mountPath, allDone);
                                                    } else {
                                                        cmd = `cd ${mountPath} && ${this.git} reset --mixed HEAD^ `;
                                                        cli.exec(cmd, (err: Error, stream: ssh.ClientChannel) => {
                                                            if (err) {
                                                                cmnUtil.showConsoleMessage(err.stack, true);
                                                            }
                                                            stream.on('close', (code, signal) => {
                                                                if (code == 0) {
                                                                    cmnUtil.showConsoleMessage(`Success: ${cmd}`);
                                                                } else {
                                                                    cmnUtil.showConsoleMessage(`Fail to reset codebase: ${errMsg}`, true);
                                                                }
                                                                checkStatus(mountPath, allDone);
                                                            });

                                                            stream.on('data', (data) => {
                                                                msg += data;
                                                            });
                                                            stream.stderr.on('data', (data) => {
                                                                errMsg += data;
                                                            });
                                                        });
                                                    }
                                                }
                                            });
                                            stream.on('data', (data) => {
                                                msg += data;
                                            });
                                            stream.stderr.on('data', (data) => {
                                                errMsg += data;
                                            });
                                        });

                                    } else {
                                        errHandling(idx);
                                        checkStatus(mountPath, allDone);
                                        cmnUtil.showConsoleMessage(`Fail: ${cmd}\ncode: [${code}]\nmessage:${msg}\n${errMsg}`, true);
                                    }
                                });
                                stream.on('data', (data) => {
                                    msg += data;
                                });
                                stream.stderr.on('data', (data) => {
                                    errMsg += data;
                                });
                            });

                        } else {
                            errHandling(idx);
                            checkStatus(mountPath, allDone);
                            cmnUtil.showConsoleMessage(`Fail: ${cmd}\ncode: [${code}]\nmessage:${msg}\n${errMsg}`, true);
                        }
                    });
                    stream.on('data', (data) => {
                        msg += data;
                    });
                    stream.stderr.on('data', (data) => {
                        errMsg += data;
                    });
                });

            });

        });

    }

    doRepoInfo(workDir, curDir: boolean = false): Thenable<string[]> {
        let cmd = `cd ${workDir} && ${this.repoTool} info ${(curDir) ? "." : ""}`;
        return this.sshExe(cmd);
    }

    doRepoStatus(workDir,
        thread: number = 24,
        curDir: boolean = false): Thenable<string[]> {
        let cmd = `cd ${workDir} && ${(curDir) ? "" : ""} ${this.repoTool} status -j ${thread} ${(curDir) ? "." : ""}`;
        return this.sshExe(cmd);
    }

    doRepoSync(workDir, thread: number = 24): Thenable<string[]> {
        let cmd = `pwd && cd ${workDir} &&  ${this.repoTool} sync -j 24 -f -c --no-tags --optimized-fetch --force-sync >sync.log`;
        return this.sshExe(cmd);
    }

    doRepoInit(workDir, options: string): Thenable<string[]> {
        let cmd = `mkdir -p ${workDir} && cd ${workDir} &&  ${this.repoTool} init ${options}`;
        return this.sshExe(cmd);
    }

    doRepoUpload(workDir: string, stdin: string, projects: string[], srcBr: string, destBr: string): Thenable<string[]> {
        let projStr = ""
        projects.forEach((v) => {
            projStr += `${v} `;
        });
        return this.sshExe(`cd ${workDir} && ${this.repoTool} upload --dest=${destBr} --br=${srcBr} ${projStr}`, stdin);
    }

    doRepoStart(workDir: string, branch: string, all: boolean = false, ): Thenable<string[]> {
        let cmd = `cd ${workDir} && ${this.repoTool} start ${branch} ${(all) ? "--all" : ""} .`;
        return this.sshExe(cmd);
    }

    doGitCommit(workDir: string, message: string): Thenable<string[]> {
        let cmd = `cd ${workDir} && ${this.git} commit -m '${message}' `;
        return this.sshExe(cmd);
    }

    doGitAdd(workDir: string, filePath: string): Thenable<string[]> {
        let cmd = `cd ${workDir} && ${this.git} add ${filePath}`;
        return this.sshExe(cmd);
    }

    doGitPush(workDir: string, remote: string, srcBr: string, destBr: string): Thenable<string[]> {
        let cmd = `cd ${workDir} && ${this.git} push ${remote} ${srcBr}:refs/for/${destBr} `;
        return this.sshExe(cmd);
    }

    doGitReset(workDir: string, ref: string, mode: string): Thenable<string[]> {
        let cmd = `cd ${workDir} && ${this.git} reset ${mode} ${ref} `;
        return this.sshExe(cmd);
    }

    private sshExe(cmd: string, stdin?: string): Thenable<string[]> {
        return new Promise((resolve, reject) => {
            var cli = new ssh.Client();
            cli.connect(this.cfg);
            cli.on("ready", () => {
                let msg = ``, errMsg = ``;
                cli.exec(cmd, (err: Error, stream: ssh.ClientChannel) => {
                    if (err) {
                        cmnUtil.showConsoleMessage(err.stack, true);
                        reject([msg, err.stack]);
                    }
                    if (stdin) {
                        stream.write(`${stdin}\n`);
                    }
                    stream.on('close', (code, signal) => {
                        if (code == 0) {
                            cmnUtil.showConsoleMessage(`Success: ${cmd}`);
                            resolve([msg, errMsg]);
                        } else {
                            cmnUtil.showConsoleMessage(`Fail ${cmd}: \n${errMsg}`, true);
                            reject([msg, errMsg]);
                        }
                    });

                    stream.on('data', (data) => {
                        msg += data;
                    });
                    stream.stderr.on('data', (data) => {
                        errMsg += data;
                    });
                });
            });
        });
    }

};
