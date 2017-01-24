'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';


export function parseGitStatus(input: string): Thenable<string> {
    return new Promise((resolve, reject) => {
        try {
            resolve(input);
        } catch (error) {
            reject(error);
        }
    });
}