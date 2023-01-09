import * as utils from '../utils';
import * as d2types from './d2types';
import { API } from '../modules';
import { ArrayBuffer2, Interceptor2 } from '../utils';
import { D2GSCmd, D2SkillID, D2StateID, D2GSPacket, D2AreaID, D2StringColor } from './types';
import { ID2Addrs, D2Net, D2Client, D2Common, D2Lang } from './d2module';

class HurricaneMonitor {
    _active         : boolean   = false;
    duration        : number    = 0;
    startTime       : number    = 0;
    nextCastTime    : number    = 0;
    actionQueue     : HurricaneMonitor.Action[] = [];

    constructor() {
        this.setupCastHurricaneTimer();
    }

    get active(): boolean {
        return this._active;
    }

    set active(active: boolean) {
        // utils.log(`setActive: ${active}`);
        this._active = active;
    }

    printPartyString(msg: string) {
        utils.log(msg);
        D2Game.D2Client.PrintPartyString(msg, D2StringColor.Grey);
    }

    onReceivePacket(packetId: D2GSCmd, payload: ArrayBuffer2) {
        switch (D2Game.D2Common.getCurrentAreaID()) {
            case D2AreaID.None:
            case D2AreaID.RogueEncampment:
            case D2AreaID.LutGholein:
            case D2AreaID.KurastDocks:
            case D2AreaID.PandemoniumFortress:
            case D2AreaID.Harrogath:
                this.active = false;
                return;

            default:
                this.active = true;
                break;
        }

        switch (packetId) {
            case D2GSCmd.MAPREVEAL:
                break;

            case D2GSCmd.SETSTATE:
            {
                const state = new D2GSPacket.SetState(payload.ptr);

                if (state.state == D2StateID.Hurricane) {
                    this.active = true;
                    // this.startTime = (new Date).getTime();
                    this.startTime = utils.getCurrentTime().getTime();
                }

                break;
            }

            case D2GSCmd.ENDSTATE:
            {
                if (!this.active)
                    return;

                const state = new D2GSPacket.EndState(payload.ptr);

                if (state.state != D2StateID.Hurricane)
                    return;

                if (this.duration == 0 && this.startTime != 0) {
                    // this.duration = ((new Date).getTime() - this.startTime) / 1000;
                    this.duration = (utils.getCurrentTime().getTime() - this.startTime) / 1000;
                    this.duration = Math.max(this.duration, 10);
                    this.duration = Math.min(this.duration, 50);
                    this.duration = Math.floor(this.duration);

                    this.startTime = 0;

                    utils.log(`duration: ${this.duration}`);
                }

                this.pushTimerAction(HurricaneMonitor.Action.EndState);
                break;
            }

            case D2GSCmd.GAMEEXIT:
                this.active = false;
                this.startTime = 0;
                this.duration = 0;
                break;
        }
    }

    pushTimerAction(action: HurricaneMonitor.Action) {
        utils.log(`pushTimerAction: ${HurricaneMonitor.Action[action]}`);
        this.actionQueue.push(action);
    }

    setupCastHurricaneTimer() {
        let maxRetry                  = 0;
        let nextRetryTime             = 0;
        let autoCastTime              = 0;
        let autoCastTimeRetry         = 0;
        let currentAction             = HurricaneMonitor.Action.Idle;
        let timerId: NodeJS.Timer | undefined;

        const RetryInterval           = 500;
        const MaxRetryTimes           = 5;
        const MaxAutoCastRetryTimes   = 2;

        const nextAction = () => {
            const a = this.actionQueue.pop();
            return a === undefined ? HurricaneMonitor.Action.Idle : a;
        }

        const setAutoCastTime = (now: number, reset: boolean = false) => {
            if (reset)
                autoCastTimeRetry = 0;

            if (autoCastTimeRetry == 0) {
                autoCastTime = now + (this.duration - 5) * 1000;
                autoCastTimeRetry = MaxAutoCastRetryTimes;

            } else {
                autoCastTimeRetry--;
                autoCastTime = now + 200;
            }

            const t = utils.getCurrentTime();
            utils.log(`nextCastTime<${timerId}>: ${t.getHours().pad(2)}:${t.getMinutes().pad(2)}:${t.getSeconds().pad(2)}.${t.getMilliseconds().pad(3)}`);
        }

        timerId = setInterval(() => {
            const now = utils.getCurrentTime().getTime();

            switch (currentAction) {
                case HurricaneMonitor.Action.Idle:
                {
                    maxRetry = 0;
                    nextRetryTime = 0;

                    if (!this.active) {
                        autoCastTimeRetry = 0;
                        autoCastTime = 0;
                        return;
                    }

                    if (autoCastTime != 0 && now >= autoCastTime) {
                        setAutoCastTime(now);

                        // const t = new Date(autoCastTime);
                        const t = utils.getCurrentTime(autoCastTime);
                        this.printPartyString(`nextCastTime<${timerId}>: ${t.getHours().pad(2)}:${t.getMinutes().pad(2)}:${t.getSeconds().pad(2)}.${t.getMilliseconds().pad(3)}`);
                        this.printPartyString('auto Hurricane');

                        D2Game.D2Client.scheduleOnMainThread(() => {
                            this.castHurricane();
                        });

                        return;
                    }

                    break;
                }

                case HurricaneMonitor.Action.EndState:
                {
                    if (!this.active || maxRetry == 0 || D2Game.D2Client.hasState(D2StateID.Hurricane)) {
                        D2Game.D2Client.scheduleOnMainThread(() => {
                            D2Game.D2Net.flushSendPending();
                        });

                        maxRetry = 0;

                        if (this.active && this.duration != 0 && D2Game.D2Client.hasState(D2StateID.Hurricane)) {
                            setAutoCastTime(now, true);
                        }

                        break;
                    }

                    if (nextRetryTime != 0 && now < nextRetryTime) {
                        return;
                    }

                    if (nextRetryTime == 0 && maxRetry == MaxRetryTimes) {
                        D2Game.D2Net.delaySend = true;
                    }

                    nextRetryTime = now + RetryInterval;

                    D2Game.D2Client.scheduleOnMainThread(() => {
                        if (maxRetry != 0 && this.active) {
                            this.printPartyString(`Hurricane retry: ${maxRetry}`);
                            maxRetry--;
                            this.castHurricane();
                        }
                    });

                    return;
                }
            }

            currentAction = nextAction();

            switch (currentAction) {
                case HurricaneMonitor.Action.EndState:
                    maxRetry = MaxRetryTimes;
                    break;
            }

        }, 100);
    }

    castHurricane() {
        utils.log(`castHurricane`);

        const x = D2Game.D2Client.playerLocation.x;
        const y = D2Game.D2Client.playerLocation.y;

        if (x == 0 || y == 0) {
            utils.log('missing playerLocation');
            return;
        }

        const leftSkill = D2Game.D2Client.leftSkill;

        if (leftSkill != D2SkillID.Hurricane)
            D2Game.D2Client.selectSkill(true, D2SkillID.Hurricane);

        D2Game.D2Client.leftSkillOnLocation(x, y);
        // D2Game.D2Client.leftSkillOnLocationEx(x, y);

        if (leftSkill != D2SkillID.None && leftSkill != D2SkillID.Hurricane)
            D2Game.D2Client.selectSkill(true, leftSkill);
    }
}

namespace HurricaneMonitor {
    export enum Action {
        Idle,
        EndState,
    }
}

export class D2Game {
    static _instance = new D2Game;

    _D2Net?     : D2Net;
    _D2Client?  : D2Client;
    _D2Common?  : D2Common;
    _D2Lang?    : D2Lang;

    monitor?    : HurricaneMonitor;

    constructor() {
        if (D2Game._instance) {
            throw new Error('ERROR');
        }

        D2Game._instance = this;
    }

    static getInstance() {
        return D2Game._instance;
    }

    static get D2Net() {
        return D2Game.getInstance()._D2Net!;
    }

    static get D2Client() {
        return D2Game.getInstance()._D2Client!;
    }

    static get D2Common() {
        return D2Game.getInstance()._D2Common!;
    }

    static get D2Lang() {
        return D2Game.getInstance()._D2Lang!;
    }

    get D2Net() {
        return this._D2Net!;
    }

    get D2Client() {
        return this._D2Client!;
    }

    get D2Common() {
        return this._D2Common!;
    }

    get D2Lang() {
        return this._D2Lang!;
    }

    init(addrs: ID2Addrs) {
        const D2Duck = Module.load('D2Duck.dll');

        this._D2Net     = new D2Net(addrs);
        this._D2Client  = new D2Client(addrs);
        this._D2Common  = new D2Common(addrs);
        this._D2Lang    = new D2Lang(addrs);

        this.hook(D2Duck);

        this.monitor = new HurricaneMonitor();
        this._D2Net.addRecvCallback(this.monitor.onReceivePacket.bind(this.monitor));
    }

    hook(d2duck: Module) {
        this._D2Net?.hook();
        this._D2Client?.hook();

        const fopen = Interceptor2.jmp(
            API.crt.fopen,
            (path: NativePointer, mode: NativePointer): NativePointer => {
                const filename = path.readAnsiString();

                if (filename == 'hackmap\\d2hackmap.cfg') {
                    const filename2 = utils.UTF8(filename + '.user');
                    const fp = fopen(filename2, mode);

                    if (!fp.isNull()) {
                        return fp;
                    }
                }

                return fopen(path, mode);
            },
            'pointer', ['pointer', 'pointer'], 'mscdecl',
        );

        const CheckTokenMembership = Interceptor2.jmp(
            API.ADVAPI32.CheckTokenMembership,
            (tokenHandle: NativePointer, sidToCheck: NativePointer, isMember: NativePointer): number => {
                const success = CheckTokenMembership(tokenHandle, sidToCheck, isMember);

                do {
                    if (success == 0)
                        break;

                    if (
                            sidToCheck.add(0x01).readU8() != 2 ||           // SubAuthorityCount
                            sidToCheck.add(0x02).readU32() != 0 ||          // SECURITY_NT_AUTHORITY
                            sidToCheck.add(0x06).readU16() != 0x500 ||      // SECURITY_NT_AUTHORITY
                            sidToCheck.add(0x08).readU16() != 0x20 ||       // SECURITY_BUILTIN_DOMAIN_RID
                            sidToCheck.add(0x0C).readU16() != 0x220         // DOMAIN_ALIAS_RID_ADMINS
                        )
                        break;

                    isMember.writeU32(1);

                } while (0);

                return success;
            },
            'int32', ['pointer', 'pointer', 'pointer'], 'stdcall',
        );

        const addrs = function() {
            const timestamp = d2duck.base.add(d2duck.base.add(0x3C).readU32() + 8).readU32();
            switch (timestamp) {
                case 0x6395FBE6:
                    return {
                        AutoPickPrintHint: d2duck.base.add(0x256C0),
                    };
            }

            return undefined;
        }();

        if (addrs === undefined)
            return;

        const AutoPickPrintHint = Interceptor2.jmp(
            addrs.AutoPickPrintHint,
            (prefix: NativePointer, itemUnit: NativePointer) => {
                AutoPickPrintHint(prefix, itemUnit);
                this.recordImportItem(new d2types.Unit(itemUnit));
            },
            'void', ['pointer', 'pointer'], 'mscdecl',
        );

        return;

        const EnumItemsFromUnitPosCallback = Interceptor2.jmp(
            d2duck.base.add(0x25440),
            (itemUnit: NativePointer, playerUnit: NativePointer): number => {
                const ret = EnumItemsFromUnitPosCallback(itemUnit, playerUnit);

                const item  = new d2types.Unit(itemUnit);
                const bin   = D2Game.D2Common.GetItemsBIN(item.TxtFileNo);
                const name  = D2Game.D2Lang.GetStringFromIndex(bin.NameStrIndex);

                if (ret != 0) {
                    utils.log(`enum ${itemUnit} ${name}`);
                }

                return ret;
            },
            'uint32', ['pointer', 'pointer'], 'fastcall',
        );
    }

    recordImportItem(item: d2types.Unit) {
        if (item.isNull())
            return;

        const fp = API.crt.wfopen(utils.UTF16('ImportItems.txt'), utils.UTF16('ab+'));
        if (fp.isNull()) {
            return;
        }

        function writeString(s: string) {
            s += '\n';
            const buf = Memory.alloc(s.length * 3);
            buf.writeUtf8String(s);
            API.crt.fwrite(buf, API.crt.strlen(buf), 1, fp);
        }

        const fileSize = API.crt._filelengthi64(API.crt._fileno(fp)).valueOf();

        switch (fileSize) {
            case 0:
                const bom = Memory.alloc(3);
                bom.writeU8(0xEF).add(1).writeU8(0xBB).add(1).writeU8(0xBF);
                API.crt.fwrite(bom, 3, 1, fp);

            case 3: // BOM only
                writeString('创建时间,拾取时间戳,拾取时间,游戏名,场景,物品ID,品质,名称');
                break;
        }

        enum D2ItemQualityCN {
            粗糙的 = 1,
            普通的 = 2,
            超强的 = 3,
            魔法的 = 4,
            套装的 = 5,
            精华的 = 6,
            暗金的 = 7,
            手工的 = 8,
        }

        const bin       = this.D2Common.GetItemsBIN(item.TxtFileNo);
        const name      = this.D2Lang.GetStringFromIndex(bin.NameStrIndex);
        const quality   = this.D2Common.GetItemQuality(item);
        const gameInfo  = this.D2Client.GameInfo;
        const itemIndex = this.getItemIndex(item);
        // const time      = new Date().getTime();
        // const time2     = new Date(time + 8 * 3600 * 1000);
        const time      = utils.getCurrentTime().getTime();
        const time2     = utils.getCurrentTime();
        const timestr   = `${(time2.getUTCMonth() + 1).pad(2)}.${time2.getUTCDate().pad(2)} ${time2.getHours().pad(2)}:${time2.getMinutes().pad(2)}:${time2.getSeconds().pad(2)}`;

        writeString([
            `${this.D2Client.gameJoinTime}`,
            `${time}`,
            `${timestr}`,
            `${gameInfo?.Name}`,
            `${this.D2Client.GetLevelNameFromLevelNo(this.D2Common.getCurrentAreaID())}`,
            `${itemIndex},${D2ItemQualityCN[quality]},${name}`,
        ].join(','));

        API.crt.fclose(fp);
    }

    getItemIndex(item: d2types.Unit): number {
        const itemTable     = this.D2Common.ItemTable;
        const weaponCount   = itemTable.WeaponTableCount;
        const armorCount    = itemTable.ArmorTableCount;
        let txtFileNo       = item.TxtFileNo;

        if (txtFileNo >= weaponCount) {
            const n = txtFileNo - weaponCount;
            if (n < armorCount) {
                const index = n + 1001;
                return index >= 6000 ? 0 : index;
            }

            txtFileNo = n - armorCount + 2000;
        }

        const index = txtFileNo + 1;
        return index >= 6000 ? 0 : index;
    }
}

export function main(addrs: ID2Addrs) {
    D2Game.getInstance().init(addrs);
}

rpc.exports = function() {
    return {
        showInfo: function() {
            const areaID = D2Game.D2Client.areaID;
            const gameInfo = D2Game.D2Client.GameInfo;

            utils.log([
                `show game info:`,
                `gameInfo: ${gameInfo?.Name}:${gameInfo?.Password}`,
                `skill left:${D2Game.D2Client.leftSkill.hex()} right:${D2Game.D2Client.rightSkill.hex()}`,
                `areaid: ${D2AreaID[areaID] !== undefined ? D2AreaID[areaID] : areaID.hex()}`,
                `gameLoaded: ${D2Game.D2Client.gameLoaded}`,
                `player location: ${D2Game.D2Client.playerLocation.x}, ${D2Game.D2Client.playerLocation.y}`,
                '',
            ].join('\n'));
        },

        printItemNameFromUnit(txtFileno: number) {
            const bin   = D2Game.D2Common.GetItemsBIN(txtFileno);
            const name  = D2Game.D2Lang.GetStringFromIndex(bin.NameStrIndex);

            utils.log(name);
        },
    };
}();
