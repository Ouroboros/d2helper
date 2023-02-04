import * as utils from './utils';

type Product<T = any> = (...args: any[]) => T;
type TaskAbortCallback = (reason?: any) => void;
type TaskExecutor<T> = (
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: any) => any,
    onAbort: (callback: TaskAbortCallback) => void,
    controller: AbortController,
) => void;

function safeRun<T = void>(bodyInvokee: Product<T>, finallyInvokee: Product<void>): Product<T> {
    return (...args: any[]) => {
        try {
            return bodyInvokee(...args);
        } finally {
            finallyInvokee();
        }
    };
}

export class AbortController {
    #aborted = false;
    private listeners = new Set<Product<void>>;

    get aborted(): boolean {
        return this.#aborted;
    }

    addListener(listener: Product<void>) {
        this.listeners.add(listener);
    }

    removeListener(listener: Product<void>) {
        this.listeners.delete(listener);
    }

    cleanup() {
        this.listeners.forEach(this.removeListener);
    }

    abort() {
        // if (this.aborted) {
        //     return;
        // }

        utils.log(`AbortController.abort: ${this.listeners.size}`);
        this.#aborted = true;
        this.listeners.forEach(l => l());
    }
}

export class Task<T = void> extends Promise<T> {
    private abortReason: any;
    private controller: AbortController;
    private name;

    constructor(executor: TaskExecutor<T>, controller = new AbortController, name = '') {
        const listeners = new Set<Product<void>>();

        const addListener = (listener: Product<void>) => {
            // utils.log(`<${name}> addListener`);
            listeners.add(listener);
            controller.addListener(listener);
        };

        const removeListener = (listener: Product<void>) => {
            // utils.log(`<${name}> removeListener`);
            listeners.delete(listener);
            controller.removeListener(listener);
        };

        const cleanup = () => {
            // utils.log(`<${name}> cleanup`);
            listeners.forEach(removeListener);
        };

        super((_resolve, _reject) => {
            const resolve = safeRun(_resolve, cleanup);
            const reject = safeRun(_reject, cleanup);

            let onAbortAdded = false;

            const onAbort = (callback: TaskAbortCallback) => {
                onAbortAdded = true;

                const listener: Product<void> = safeRun(
                    () => callback(this.abortReason),
                    () => removeListener(listener)
                );

                addListener(listener);
            };

            const defaultAbort: Product<void> = safeRun(
                () => {
                    utils.log(`<${name}> default onAbort1`);
                    if (!onAbortAdded) {
                        utils.log(`${this.name} default onAbort2`);
                        reject(this.abortReason);
                    }
                },
                () => removeListener(defaultAbort)
            );

            addListener(defaultAbort);

            executor(resolve, reject, onAbort, controller);
        });

        this.name = name;
        this.controller = controller;
    }

    get aborted(): boolean {
        return this.controller.aborted;
    }

    abort(reason?: any) {
        utils.log(`<${this.name}> Task.abort`);
        this.abortReason = reason;
        this.controller.abort();
    }
}
