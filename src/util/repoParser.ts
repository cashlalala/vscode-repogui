'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as util from 'util';

const namedRegexp = require('named-js-regexp');

export function genRepoStatus(proj: string): {} {
    let tmp = {};
    return tmp[proj] = {
        'branch': "",
        'changes': []
    };
}

export function parseRepoStatus(input: string): Map<string, Object> {
    /* sample output
    
    project art/                                    branch cash_test
     -m     NOTICE
    project abi/cpp/                                branch cash_test
     Mm     src/class_type_info.cc
     --     src/test.h
    project developers/samples/android/             (*** NO BRANCH ***)
     -m     README.txt
    
    { 
        'projName' : {
            'branch' : "",
            changes : [
                {'f1' : 'status'},
                {'f2' : 'status'}
            ]
        }
    }
    */
    let changedRepos: Map<string, Object> = new Map<string, Object>();
    input.split('project').forEach((v: string) => {
        if (!v || v == '\n' || v.indexOf('nothing to commit (working directory clean)') > -1) return;

        let repoStatus = new Object();
        repoStatus['changes'] = [];
        let repoProj = "";

        v.split('\n').forEach((token, idx) => {
            if (!token || token.indexOf("is submitted to") > -1) { // skip ...
                return;
            }
            if (idx == 0) {
                let nr = namedRegexp(/(:<proj>\S+)\s+(branch (:<branch>\S+)|(:<branch>\(\*\*\* NO BRANCH \*\*\*\)))/g);
                let m = nr.exec(token)
                repoProj = m.groups()['proj'];
                repoStatus['project'] = repoProj;
                repoStatus['branch'] = m.groups()['branch'];
            } else {
                let nr = namedRegexp(/ (:<status>\S+)\s+(:<fp>\S+)/g);
                let m = nr.exec(token);
                repoStatus['changes'].push({ 'file': m.groups()['fp'], 'status': m.groups()['status'] });
            }
        });

        if (!repoProj) return;
        changedRepos.set(repoProj, repoStatus);
    });
    return changedRepos;
}


export function parseRepoStatusAsync(input: string): Thenable<Map<string, Object>> {
    return new Promise((resolve, reject) => {
        try {
            resolve(parseRepoStatus(input));
        } catch (error) {
            reject(error);
        }
    });
}

export function parseRepoInfo(input: string, keepManifst: boolean = true): Object[] {
    let repos: Object[] = [];

    input.split("----------------------------").forEach((val, idx) => {
        let obj = new Object();
        let regex = null;
        let m = null;
        if (!val || val == "\n") return;
        if (idx > 0) {
            regex = /Project: (.*)/g;
            m = regex.exec(val);
            if (m) {
                obj['project'] = m[1];
            }
            regex = /Mount path: (.*)/g;
            m = regex.exec(val);
            if (m) {
                obj['mount-path'] = m[1];
            }
            regex = /Current revision: (.*)/g;
            m = regex.exec(val);
            if (m) {
                obj['current-version'] = m[1];
            }
            regex = /Local Branches: (.*)/g;
            m = regex.exec(val);
            if (m) {
                obj['local-branch'] = m[1];
            }
        } else {
            regex = /Manifest branch: (.*)/g;
            m = regex.exec(val);
            if (m) {
                obj['manifest-branch'] = m[1];
            }
            regex = /Manifest merge branch: (.*)/g;
            m = regex.exec(val);
            if (m) {
                obj['manifest-merged-branch'] = m[1];
            }
            regex = /Manifest groups: (.*)/g;
            m = regex.exec(val);
            if (m) {
                obj['manifest-group'] = m[1];
            }
            if (!keepManifst) {
                return;
            }
        }
        repos.push(obj);
    });

    return repos;
}

export function parseRepoInfoAsync(input: string, keepManifst: boolean = true): Thenable<Object[]> {
    return new Promise((resolve, reject) => {
        try {
            resolve(parseRepoInfo(input, keepManifst));
        } catch (error) {
            reject(error);
        }
    });
}