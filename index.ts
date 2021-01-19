import Tail from "nodejs-tail";
import { spawn } from "child_process";
import { exit } from "process";
import { Command } from "commander";
import { decode } from "iconv-lite";
import { delimiter, join, normalize, parse } from "path";

const unityOptions = ["-batchmode", "-quit"];
const unityOptionsWithValue = ["-buildTarget", "-executeMethod", "-projectPath", "-CacheServerIPAddress"];
const encoding = process.platform == "win32" ? "GBK" : "utf8";

function FixArg(arg: string) {
    return `\"${arg}\"`;
}

var program = new Command();
program.requiredOption("-u,--unity-path <path>", "Path to unity exe")
    .option("-l,--log-file <path>", "Path to log file");
unityOptions.forEach(option => {
    program.option(option);
});
unityOptionsWithValue.forEach(option => {
    program.option(option + " <value>");
});

program.parse(process.argv);

const options = program.opts();

var unityPath: string = options.unityPath;
var logFile: string = normalize(options.logFile ?? join(process.cwd(), "run.log"));
var args: string[] = [];
//收集Unity需要的参数
for (var i = 0; i < process.argv.length; i++) {
    var arg = process.argv[i];
    if (unityOptions.indexOf(arg) >= 0)
        args.push(arg);
    else if (unityOptionsWithValue.indexOf(arg) >= 0) {
        args.push(arg, FixArg(process.argv[i + 1]));
        i++;
    }

}
//替换logFile参数
var logArgExist = false;
for (var i = 0; i < process.argv.length; i++) {
    var arg = process.argv[i];
    if (arg === "-l" || arg === "--log-file") {
        args.push("-logFile", logFile);
        logArgExist = true;
        break;
    }
}
if (!logArgExist) {
    args.push("-logFile", logFile);
}


//监听日志
function watchLog() {
    var isWin32 = process.platform == "win32";
    var tail = new Tail(logFile, { usePolling: isWin32, ignoreInitial: false });
    tail.on("line", data => {
        console.log(data);
    });
    tail.on("close", () => {
        console.log("watch close");
    });
    tail.watch();
    console.log("start watching logs: " + logFile);
}

//启动Unity
function runUnity() {
    var parsedUnityPath = parse(unityPath);
    var env = process.env;
    var path = env.PATH;
    var paths = path ? path.split(delimiter) : [];
    paths.push(parsedUnityPath.dir);
    env.PATH = paths.join(delimiter);
    var unityProcess = spawn(parsedUnityPath.base, args, { shell: process.platform === "win32", env: env });
    unityProcess.stdout.on("data", data => {
        if (data instanceof Buffer)
            console.log(decode(data, encoding));
        else
            console.log(data);
    });
    unityProcess.stderr.on("data", data => {
        if (data instanceof Buffer)
            console.error(decode(data, encoding));
        else
            console.error(data);
    });
    unityProcess.on("error", err => {
        console.error(err);
        exit(1);
    });
    unityProcess.on("close", code => {
        console.log("Unity process exit: " + code);
        exit(code!);
    });
    unityProcess.on("message", msg => {
        console.log(msg);
    });
}

function main() {
    runUnity();
    watchLog();
}

main();