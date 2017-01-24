'use strict';

import * as path from 'path';
import * as vscode from 'vscode';

import * as cmnUtil from '../util/commonUtil';
import * as ext from '../extension';

export function getQueryVariable(query, variable) {
    var qryObj = getQueryVariables(query);
    return qryObj[variable];
}

export function getQueryVariables(query) {
    var vars = query.split('&');
    var result = {};
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        result[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1])
    }
    return result;
}

export function encodeBase64(src: string): string {
    return new Buffer(src).toString('base64');
}

export function decodeBase64(src: string): string {
    return new Buffer(src, 'base64').toString('ascii');
}

export function getId(): string {
    return new Date().getTime().toString();
}

export function diff(x: Object[], y: Object[]) {
    return x.filter((i) => { return 0 > y.indexOf(i) });
}


