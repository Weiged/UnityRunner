declare module "nodejs-tail"
{
    import EventEmitter from "events";
    import { WatchOptions } from "chokidar";
    export default class nodejs_tail extends EventEmitter {
        constructor(fileName: string, options?: WatchOptions): void;
        watch(): void;
        close(): void;
        on(event: "line", listen: (data: string) => void);
        on(event: "close", listen: () => void);
    }
}