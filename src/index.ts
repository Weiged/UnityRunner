import TailWin from "nodejs-tail";
import { Tail as TailUnix } from "tail";
import { spawn } from "child_process";
import { exit } from "process";
import { Command } from "commander";
import { decode } from "iconv-lite";
import { delimiter, join, normalize, parse } from "path";

const unityOptions = ["-batchmode", "-quit"];
const unityOptionsWithValue = ["-buildTarget", "-executeMethod", "-projectPath", "-CacheServerIPAddress"];
const encoding = process.platform == "win32" ? "GBK" : "utf8";

let program = new Command();
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

let unityPath: string = options.unityPath;
let logFile: string = normalize(options.logFile ?? join(process.cwd(), "run.log"));
let args: string[] = [];
//收集Unity需要的参数
for (let i = 0; i < process.argv.length; i++) {
    let arg = process.argv[i];
    if (unityOptions.indexOf(arg) >= 0)
        args.push(arg);
    else if (unityOptionsWithValue.indexOf(arg) >= 0) {
        args.push(arg, process.argv[i + 1]);
        i++;
    }

}
//替换logFile参数
let logArgExist = false;
for (let i = 0; i < process.argv.length; i++) {
    let arg = process.argv[i];
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
    let isWin32 = process.platform == "win32";
    if (isWin32) {
        let tail = new TailWin(logFile, { usePolling: true, ignoreInitial: false });
        tail.on("line", data => {
            console.log(data);
        });
        tail.on("close", () => {
            console.log("watch close");
        });
        tail.watch();
    } else {
        let tail = new TailUnix(logFile);
        tail.on("line", data => {
            console.log(data);
        });
        tail.on("error", err => {
            console.error(err);
        });
    }
    console.log("start watching logs: " + logFile);
}

//启动Unity
function runUnity() {
    let parsedUnityPath = parse(unityPath);
    let env = process.env;
    let path = env.PATH;
    let paths = path ? path.split(delimiter) : [];
    paths.push(parsedUnityPath.dir);
    env.PATH = paths.join(delimiter);
    let unityProcess = spawn(parsedUnityPath.base, args, { shell: process.platform === "win32", env: env });
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