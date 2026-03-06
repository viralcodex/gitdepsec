import { Response } from "express";

const SSE_HEADERS = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "X-Accel-Buffering": "no",
};

export const initializeSse = (res: Response) => {
    res.writeHead(200, SSE_HEADERS);
};

export const writeSseData = (res: Response, payload: unknown) => {
    if (res.destroyed || res.writableEnded) {
        return;
    }
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

export const writeSseEvent = (res: Response, eventName: string, payload: unknown) => {
    if (res.destroyed || res.writableEnded) {
        return;
    }
    res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
};

export const createResettableTimeout = (timeoutMs: number, onTimeout: () => void) => {
    let timeoutHandle: NodeJS.Timeout;

    const schedule = () => {
        timeoutHandle = setTimeout(onTimeout, timeoutMs);
    };

    const reset = () => {
        clearTimeout(timeoutHandle);
        schedule();
    };

    const clear = () => {
        clearTimeout(timeoutHandle);
    };

    schedule();

    return {
        reset,
        clear,
    };
};
