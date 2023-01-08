import { sprintf, vsprintf } from "sprintf-js";
import { API } from "./modules";

export const Logging = !false;

declare global {
    interface Number {
        pad(base: number): string;
        hex(): string;
    }
}

Number.prototype.pad = function (base: number): string {
    const s = String(this);
    const len = s.length;

    if (len >= base)
        return s;

    return new Array(base - len + 1).join('0') + s;

    // let nr = Number(this), len = (String(base).length - String(nr).length)+1;
    // return len > 0? new Array(len).join('0') + nr : nr.toString(base);
};

Number.prototype.hex = function () {
    let prefix = '';
    if (this < 0x10)
        prefix = '0';

    return '0x' + prefix + this.toString(16);
};

export class Interceptor2 {
    static call<RetType extends NativeCallbackReturnType, ArgTypes extends NativeCallbackArgumentType[] | []> (
        target: NativePointerValue,
        replacement: NativeCallbackImplementation<
                GetNativeCallbackReturnValue<RetType>,
                Extract<GetNativeCallbackArgumentValue<ArgTypes>, unknown[]>
            >,
        retType : RetType,
        argTypes: ArgTypes,
        abi     : NativeABI,
    ) {
        Interceptor.replace(target, new NativeCallback(replacement, retType, argTypes, abi));
        Interceptor.flush();
        Memory.patchCode(target, 1, (code: NativePointer) => {
            code.writeU8(0xE8);
        });
    }

    static jmp<RetType extends NativeCallbackReturnType, ArgTypes extends NativeCallbackArgumentType[] | []> (
        target: NativePointerValue,
        replacement: NativeCallbackImplementation<
                GetNativeCallbackReturnValue<RetType>,
                Extract<GetNativeCallbackArgumentValue<ArgTypes>, unknown[]>
            >,
        retType : RetType,
        argTypes: ArgTypes,
        abi     : NativeABI,
    ) {
        const stub = new NativeFunction(target, retType, argTypes, abi);
        Interceptor.replace(target, new NativeCallback(replacement, retType, argTypes, abi));
        return stub;
    }
}

export function log(format: any, ...args: any[]): void {
    if (!Logging)
        return;

    if (args.length != 0) {
        format = vsprintf(format, args);
    }

    // const offset = (8 * 3600 - now.getTimezoneOffset()) / 3600;
    const now1 = new Date;
    const now = new Date(now1.getTime() + 8 * 3600 * 1000);
    const time = sprintf('%02d:%02d:%02d.%03d', now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    const msg = `${time} ${format}`;
    console.log(msg);
    send({msg: 'log', data: msg});
}

export function arrayToBytes(data: number[]): ArrayBuffer {
    const p = Memory.alloc(data.length);
    p.writeByteArray(data);

    const buf = ArrayBuffer.wrap(p, data.length);
    (buf as any).ptr = p;

    return buf;
}

export interface ArrayBuffer2 extends ArrayBuffer {
    ptr: NativePointer;
}

export function ptrToBytes(addr: NativePointer, size: number): ArrayBuffer2 {
    const buf = ArrayBuffer.wrap(addr, size);
    (buf as any).ptr = addr;
    return buf as ArrayBuffer2;
}

export function UTF16(s: string): NativePointer {
    return s ? Memory.allocUtf16String(s) : NULL;
}

export function UTF8(s: string): NativePointer {
    return s ? Memory.allocUtf8String(s) : NULL;
}

export function readMBCS(p: NativePointer, encoding: string, length?: number): string {
    const len = length ? length : API.crt.strlen(p);
    if (len == 0)
        return '';

    const codePage = ({
        gbk     : 936,
        sjis    : 932,
    })[encoding];

    if (!codePage)
        return `<unknown encoding: ${encoding}>`;

    const wchar = Memory.alloc((len + 1) * 2);
    const ret = API.WIN32.MultiByteToWideChar(codePage, 0, p, len, wchar, len);
    wchar.add(ret * 2).writeU16(0);

    return wchar.readUtf16String()!;
}

export function readFileContent(path: string): ArrayBuffer2 | null {
    const fp = API.crt.wfopen(UTF16(path), UTF16('rb')) as NativePointer;
    if (fp.isNull()) {
        return null;
    }

    const fileSize = API.crt._filelengthi64(API.crt._fileno(fp)) as UInt64;

    const p = Memory.alloc(fileSize);

    const bytesRead = API.crt.fread(p, fileSize, 1, fp);

    API.crt.fclose(fp);

    return ptrToBytes(p, fileSize.toNumber());
}

export function isPathExists(path: string): boolean {
    const INVALID_FILE_ATTRIBUTES = 0xFFFFFFFF;
    return API.WIN32.GetFileAttributesA(Memory.allocAnsiString(path)) != INVALID_FILE_ATTRIBUTES;
}
