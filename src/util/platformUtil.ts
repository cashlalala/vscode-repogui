'use strict';
import * as path from "path";

export function isLinux(): boolean {
    return process.platform == "linux";
}

export function isWindows(): boolean {
    return process.platform == "win32";
}

export function getUserSettingPath(): string {
    var usrHome = "";
    if (isLinux()) {
        usrHome = path.posix.join(process.env.HOME,".config","Code","User","settings.json");
    } else if (isWindows()) {
        usrHome = path.win32.join(process.env.APPDATA,"Code","User", "settings.json");
    } else {
        throw new Error(`Not supported platform! ${process.platform}`);
    }
    return usrHome;
}