import path from 'path';
import * as utils from '../utils';
import * as types from './types';
import * as d2types from './d2types';
import { API } from '../modules';
import { ArrayBuffer2, Interceptor2 } from '../utils';
import { D2ClientCmd, D2GSCmd, D2SkillID, D2StateID, D2GSPacket, D2LevelNo, D2StringColor, D2UnitType, D2ItemQualityCN } from './types';
import { ID2Addrs, D2Net, D2Client, D2Common, D2Multi, D2Lang } from './d2module';

class HurricaneMonitor {
    _active         : boolean   = false;
    _disabled       : boolean   = false;
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
        this._active = active;
    }

    get disabled(): boolean {
        return this._disabled;
    }

    set disabled(disabled: boolean) {
        this._disabled = disabled;
    }

    printPartyString(msg: string, color: D2StringColor = D2StringColor.Grey) {
        utils.log(msg);
        D2Game.D2Client.PrintPartyString(msg, color);
    }

    onSendPacket(packetId: D2ClientCmd, payload: ArrayBuffer2) {
        switch (packetId) {
            case D2ClientCmd.LEAVEGAME:
                this.active = false;
                this.startTime = 0;
                this.duration = 0;
                D2Game.D2Net.discardSendPending();
                break;
        }
    }

    onReceivePacket(packetId: D2GSCmd, payload: ArrayBuffer2) {
        switch (D2Game.D2Common.getCurrentLevelNo()) {
            case D2LevelNo.None:
            case D2LevelNo.RogueEncampment:
            case D2LevelNo.LutGholein:
            case D2LevelNo.KurastDocks:
            case D2LevelNo.PandemoniumFortress:
            case D2LevelNo.Harrogath:
                this.active = false;
                break;

            default:
                this.active = true;
                break;
        }

        if (this.disabled && packetId != D2GSCmd.GAMEEXIT)
            return;

        switch (packetId) {
            case D2GSCmd.MAPREVEAL:
                break;

            case D2GSCmd.SETSTATE:
            {
                const state = new D2GSPacket.SetState(payload.ptr);

                if (state.state == D2StateID.Hurricane) {
                    this.active = true;
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

                if (state.unitGUID != D2Game.D2Client.GetPlayerUnit().ID)
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
                D2Game.D2Net.discardSendPending();
                break;
        }
    }

    pushTimerAction(action: HurricaneMonitor.Action) {
        utils.log(`pushTimerAction: ${HurricaneMonitor.Action[action]}`);
        this.actionQueue.push(action);
    }

    setupCastHurricaneTimer() {
        let maxRetry            = 0;
        let nextRetryTime       = 0;
        let autoCastTime        = 0;
        let autoCastRetry       = 0;
        let currentAction       = HurricaneMonitor.Action.Idle;
        let previousDisabled    = false;
        let timerId: NodeJS.Timer | undefined;

        const RetryInterval           = 500;
        const MaxRetryTimes           = 10;
        const MaxAutoCastRetryTimes   = 2;

        const nextAction = () => {
            const a = this.actionQueue.pop();
            return a === undefined ? HurricaneMonitor.Action.Idle : a;
        }

        const setAutoCastTime = (now: number, reset: boolean = false) => {
            if (reset)
                autoCastRetry = 0;

            if (autoCastRetry == 0) {
                autoCastTime = now + (this.duration - 5) * 1000;
                autoCastRetry = MaxAutoCastRetryTimes;

            } else {
                autoCastRetry--;
                autoCastTime = now + 200;
            }

            const t = utils.getCurrentTime();
            utils.log(`nextCastTime<${timerId}>: ${t.getHours().pad(2)}:${t.getMinutes().pad(2)}:${t.getSeconds().pad(2)}.${t.getMilliseconds().pad(3)}`);
        }

        const reset = () => {
            maxRetry        = 0;
            nextRetryTime   = 0;
            autoCastTime    = 0;
            autoCastRetry   = 0;

            D2Game.D2Net.flushSendPending();
        };

        D2Game.D2Client.onKeyDown((vk: number) => {
            switch (vk) {
                case 0xDC:  // VK_OEM_5     \
                    this.disabled = !this.disabled;
                    if (this.disabled)
                        reset();

                    D2Game.D2Client.showKeyAction('Auto Hurricane', this.disabled);
                    break;
            }
        });

        timerId = setInterval(() => {
            const now = utils.getCurrentTime().getTime();

            if (this.disabled) {
                return;
            }

            switch (currentAction) {
                case HurricaneMonitor.Action.Idle:
                {
                    maxRetry = 0;
                    nextRetryTime = 0;

                    if (!this.active) {
                        // reset();
                        autoCastRetry = 0;
                        autoCastTime = 0;
                        return;
                    }

                    if (autoCastTime != 0 && now >= autoCastTime) {
                        setAutoCastTime(now);

                        // const t = new Date(autoCastTime);
                        const t = utils.getCurrentTime(autoCastTime);
                        this.printPartyString(`nextCastTime<${timerId}>: ${t.getHours().pad(2)}:${t.getMinutes().pad(2)}:${t.getSeconds().pad(2)}.${t.getMilliseconds().pad(3)}`);
                        this.printPartyString(`auto Hurricane<${autoCastRetry}>`);

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
                        D2Game.D2Net.flushSendPending();

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

        if (leftSkill != D2SkillID.Dru_Hurricane)
            D2Game.D2Client.selectSkill(true, D2SkillID.Dru_Hurricane);

        D2Game.D2Client.leftSkillOnLocation(x, y);
        // D2Game.D2Client.leftSkillOnLocationEx(x, y);

        if (leftSkill != D2SkillID.None && leftSkill != D2SkillID.Dru_Hurricane)
            D2Game.D2Client.selectSkill(true, leftSkill);
    }
}

namespace HurricaneMonitor {
    export enum Action {
        Idle,
        EndState,
    }
}

interface ID2Duck {
    AutoPick: {
        PrintHint           : NativePointer;
        // PickupItem          : NativePointer;
        // OnItemPickedUp      : NativePointer;
        // PutItemToCube       : NativePointer;
        // PutItemToCubeCehck1 : NativePointer;

        // CallFindNearest     : NativePointer;

        GetPickupType       : NativeFunction<number, [NativePointer]>;
    }

    MagicBag: {
        GetCertainBagWhichStoreItem : NativeFunction<NativePointer, [NativePointer, NativePointer, NativePointer, NativePointer]>;
    }

    Hackmap: {
        GetUnitHiddenType           : NativeFunction<number, [NativePointer]>;
        QuickNextGame               : NativeFunction<void, [number]>;
    }

    // FunctionPointer: {
    //     D2Common_FindNearestUnitFromPos : NativePointer;
    // }
}

export class D2Game {
    static _instance = new D2Game;

    addrs?      : ID2Addrs;
    _D2Net?     : D2Net;
    _D2Client?  : D2Client;
    _D2Common?  : D2Common;
    _D2Multi?   : D2Multi;
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

    static get D2Multi() {
        return D2Game.getInstance()._D2Multi!;
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

    get D2Multi() {
        return this._D2Multi!;
    }

    get D2Lang() {
        return this._D2Lang!;
    }

    init(addrs: ID2Addrs) {
        const d2DuckLoaded = Process.findModuleByName('D2Duck.dll') != null;
        const D2Duck = Module.load('D2Duck.dll');

        this.addrs = addrs;

        // this.init2(addrs);
        this.hookD2Duck(D2Duck);

        if (d2DuckLoaded) {
            this.init2(addrs);

        } else {
            this.delayInit(addrs);
        }
    }

    delayInit(addrs: ID2Addrs) {
        const AddAccessDeniedAce = Interceptor2.jmp(
            API.ADVAPI32.AddAccessDeniedAce,
            (acl: NativePointer, aceRevision: number, accessMask: number, sid: NativePointer): number => {
                if (accessMask == 0xF01FFFFE)
                    this.init2(addrs);

                return AddAccessDeniedAce(acl, aceRevision, accessMask, sid);
            },
            'int32', ['pointer', 'uint32', 'uint32', 'pointer'], 'stdcall',
        );
    }

    init2(addrs: ID2Addrs) {
        this._D2Net     = new D2Net(addrs);
        this._D2Client  = new D2Client(addrs);
        this._D2Common  = new D2Common(addrs);
        this._D2Multi   = new D2Multi(addrs);
        this._D2Lang    = new D2Lang(addrs);

        this.hook();

        this.monitor = new HurricaneMonitor();
        this.D2Net.onRecv(this.monitor.onReceivePacket.bind(this.monitor));
        this.D2Net.onSend(this.monitor.onSendPacket.bind(this.monitor));
    }

    hook() {
        this._D2Net?.hook();
        this._D2Client?.hook();
    }

    getD2Duck(): ID2Duck | null {
        const d2duck = Process.findModuleByName('D2Duck.dll');
        if (!d2duck)
            return null;

        const timestamp = d2duck.base.add(d2duck.base.add(0x3C).readU32() + 8).readU32();
        switch (timestamp) {
            // case 0x6395FBE6:
            //     return {
            //         AutoPick: {
            //             PrintHint                       : d2duck.base.add(0x256C0),
            //             // PickupItem                      : d2duck.base.add(0x5EFD0),
            //             // OnItemPickedUp                  : d2duck.base.add(0x25500),
            //             // PutItemToCube                   : d2duck.base.add(0x5EE90),
            //             // PutItemToCubeCehck1             : d2duck.base.add(0x5EEEF),

            //             // CallFindNearest                 : d2duck.base.add(0x25818),
            //             GetPickupType                   : new NativeFunction(d2duck.base.add(0x25660), 'uint8', ['pointer'], 'mscdecl'),
            //         },

            //         MagicBag: {
            //             GetCertainBagWhichStoreItem     : new NativeFunction(d2duck.base.add(0x4C3C0), 'pointer', ['pointer', 'pointer', 'pointer', 'pointer'], 'mscdecl'),
            //         },

            //         Hackmap: {
            //             GetUnitHiddenType              : new NativeFunction(d2duck.base.add(0x1D5B0), 'uint8', ['pointer'], 'fastcall'),
            //         },

            //         // FunctionPointer: {
            //         //     D2Common_FindNearestUnitFromPos : d2duck.base.add(0x4A00610),
            //         // },
            //     };

            case 0x63CA4734:
                return {
                    AutoPick: {
                        PrintHint                   : d2duck.base.add(0xF5171A0 - 0xF4F0000),
                        GetPickupType               : new NativeFunction(d2duck.base.add(0xF517140 - 0xF4F0000), 'uint8', ['pointer'], 'mscdecl'),
                    },

                    MagicBag: {
                        GetCertainBagWhichStoreItem : new NativeFunction(d2duck.base.add(0xF53F390 - 0xF4F0000), 'pointer', ['pointer', 'pointer', 'pointer', 'pointer'], 'mscdecl'),
                    },

                    Hackmap: {
                        GetUnitHiddenType           : new NativeFunction(d2duck.base.add(0xF50F040 - 0xF4F0000), 'uint8', ['pointer'], 'fastcall'),
                        QuickNextGame               : new NativeFunction(d2duck.base.add(0xF512780 - 0xF4F0000), 'void', ['int32'], 'mscdecl'),
                    },
                };
        }

        return null;
    }

    hookD2Duck(d2duck: Module) {
        // this.dumpMPQFiles();

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

        const duck = this.getD2Duck()

        if (duck == null)
            return;

        const AutoPickPrintHint = Interceptor2.jmp(
            duck.AutoPick.PrintHint,
            (prefix: NativePointer, itemUnit: NativePointer) => {
                AutoPickPrintHint(prefix, itemUnit);
                this.recordImportItem(new d2types.Unit(itemUnit));
            },
            'void', ['pointer', 'pointer'], 'mscdecl',
        );

        const QuickNextGame = Interceptor2.jmp(
            duck.Hackmap.QuickNextGame,
            (step: number) => {
                step = ptr(step).toInt32();
                QuickNextGame(step < 0 ? -step : step);
                if (step <= 0) {
                    return;
                }

                let retry = 0;
                const timerId = setInterval(function() {
                    if (retry++ == 10)
                        clearInterval(timerId);

                    D2Game.D2Client.scheduleOnMainThread(function() {
                        switch (D2Game.D2Client.ClientState) {
                            case types.D2ClientState.None:
                            case types.D2ClientState.JoinGame:
                            {
                                if (!D2Game.D2Multi.BNCreateGameTabOnClick()) {
                                    break;
                                }

                                D2Game.D2Multi.BNCreateGameBtnOnClick();
                                clearInterval(timerId);
                                return;
                            }
                        }
                    });

                }, 500);
            },
            'void', ['uint32'], 'mscdecl',
        );

        // this.fixAutoPick(duck);
    }

    dumpMPQFiles() {
        const MPQLoadFile = Interceptor2.jmp(
            this.addrs!.Storm.LoadFile,
            function(fileInfo: NativePointer, buffer: NativePointer, bufferSize: number, outputSize: NativePointer, arg5: number, arg6: number, arg7: number): number {
                if (outputSize.isNull()) {
                    outputSize = Memory.alloc(4);
                }

                const ok = MPQLoadFile(fileInfo, buffer, bufferSize, outputSize, arg5, arg6, arg7);
                if (!ok)
                    return ok;

                // return ok;

                const filename = fileInfo.add(8).readAnsiString()!;

                if (filename == '(attributes)')
                    return ok;

                if (!filename.toLocaleLowerCase().startsWith('data\\'))
                    return ok;

                if (['.bin', '.tbl', '.txt'].indexOf(path.extname(filename)) == -1) {
                    return ok;
                }

                utils.log(`load ${filename}`);

                const dumpPath = path.join('MPQDumped', filename).replaceAll('\\', '/');

                // utils.log(`dumpPath: ${dumpPath}`);

                const dirs = [];

                for (let dir = path.dirname(dumpPath); dir != '.'; dir = path.dirname(dir)) {
                    dirs.push(dir);
                }

                for (let dir of dirs.reverse()) {
                    // utils.log(`create dir: ${dir}`);
                    API.WIN32.CreateDirectoryW(utils.UTF16(dir), NULL);
                }

                const fp = API.crt.wfopen(utils.UTF16(dumpPath.replaceAll('/', '\\')), utils.UTF16('wb'));
                if (!fp.isNull()) {
                    API.crt.fwrite(buffer, outputSize.readU32(), 1, fp);
                    API.crt.fclose(fp);
                }

                return ok;
            },
            'uint32', ['pointer', 'pointer', 'uint32', 'pointer', 'uint32', 'uint32', 'uint32'], 'stdcall',
        );
    }

    fixAutoPick(duck: ID2Duck) {
        // Interceptor2.call(
        //     duck.AutoPick.PutItemToCubeCehck1,
        //     () => {
        //         const ret = this.addrs!.D2Client.sub_486D10();

        //         if (ret == 0 || ret == 1)
        //             return 1;

        //         if (this.addrs!.D2Client.sub_44DB30()) {
        //             this.addrs!.D2Client.CancelTrade();
        //             return 0;
        //         }

        //         return 1;
        //     },
        //     'uint32', [],
        //     'stdcall',
        // );

        return;
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

        const bin       = this.D2Common.GetItemsBIN(item.TxtFileNo);
        const name      = this.D2Lang.GetStringFromIndex(bin.NameStrIndex);
        const quality   = this.D2Common.GetItemQuality(item);
        const gameInfo  = this.D2Client.GameInfo;
        const itemIndex = this.getItemMaphackID(item);
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
            `${this.D2Client.GetLevelNameFromLevelNo(this.D2Common.getCurrentLevelNo())}`,
            `${itemIndex},${D2ItemQualityCN[quality]},${name}`,
        ].join(','));

        API.crt.fclose(fp);
    }

    getItemMaphackID(item: d2types.Unit): number {
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
        test() {
            D2Game.D2Client.scheduleOnMainThread(() => {
                const pos = D2Game.D2Client.getPlayerPosition();
                return D2Game.D2Common.findNearbyUnits(D2Game.D2Client.GetPlayerUnit(), 20, (unit: d2types.Unit, source: d2types.Unit, room1: d2types.Room1) => {
                    if (unit.Type != D2UnitType.Item)
                        return false;

                    const d = Math.floor(D2Game.D2Common.getUnitDistanceByPoints(pos, D2Game.D2Common.getUnitPosition(unit)));
                    utils.log(`<${unit}> type: ${unit.Type} name: ${D2Game.D2Client.GetUnitName(unit)} d: ${d}`);

                    return false;
                });

                const unit = D2Game.D2Common.findRoomTileByLevelNo(30, 8);
                if (!unit) {
                    utils.log('tile not found');
                    return;
                }

                utils.log(`${unit}`);
                D2Game.D2Client.interactWithEntity(unit!.Type, unit!.ID);

                return;

                const room1 = D2Game.D2Common.GetRoomFromUnit(D2Game.D2Client.GetPlayerUnit());
                const rooms = D2Game.D2Common.GetNearbyRooms(room1);

                utils.log(`room1: ${room1}`);

                const lines = [''];

                for (let r of rooms) {
                    const lvlno = D2Game.D2Common.GetLevelNoFromRoom(r);
                    let unit = r.FirstUnit;
                    const room2 = r.Room2;

                    if (unit.isNull())
                        continue;

                    lines.push(`  room1: ${r} room2: ${room2} tiles: ${room2.RoomTiles}`);

                    while (!unit.isNull()) {
                        const pos = D2Game.D2Common.getUnitPosition(unit);
                        const playerPos = D2Game.D2Client.getPlayerPosition();
                        const distance = D2Game.D2Common.getUnitDistanceByPoints(pos, playerPos);
                        lines.push(`    unit: ${unit} lvlno: ${lvlno} first_unit<${unit.Type}>: ${unit} pos: ${pos} @ ${Math.floor(distance)} name:${D2Game.D2Client.GetUnitName(unit)}`);

                        unit = unit.NextRoomUnit;
                    }

                    lines.push('');
                }

                lines.push('');
                utils.log(lines.join('\n'));
            });
        },

        showInfo: function() {
            const levelNo = D2Game.D2Client.levelNo;
            const gameInfo = D2Game.D2Client.GameInfo;

            utils.log([
                `show game info:`,
                `gameInfo: ${gameInfo?.Name}:${gameInfo?.Password}`,
                `skill left:${D2Game.D2Client.leftSkill.hex()} right:${D2Game.D2Client.rightSkill.hex()}`,
                `levelNo: ${D2LevelNo[levelNo] !== undefined ? D2LevelNo[levelNo] : levelNo.hex()}`,
                `gameLoaded: ${D2Game.D2Client.gameLoaded}`,
                `player location: ${D2Game.D2Client.playerLocation.x}, ${D2Game.D2Client.playerLocation.y}`,
                '',
            ].join('\n'));
        },

        printItemNameFromTxtFileNo(txtFileno: number) {
            const bin   = D2Game.D2Common.GetItemsBIN(txtFileno);
            const name  = D2Game.D2Lang.GetStringFromIndex(bin.NameStrIndex);

            utils.log(name);
        },

        enumUnits(range: number = 5) {
            D2Game.D2Client.scheduleOnMainThread(function() {
                const player = D2Game.D2Client.GetPlayerUnit();
                const pos = D2Game.D2Common.getUnitPosition(player);
                D2Game.D2Common.FindNearestUnitFromPos(player, pos.x, pos.y, range, new NativeCallback(
                    (target: NativePointer, source: NativePointer): number => {
                        const unit = new d2types.Unit(target);

                        if (unit.Type == D2UnitType.Player)
                            return 0;

                        const pos = D2Game.D2Common.getUnitPosition(unit);
                        const room = D2Game.D2Common.GetRoomFromUnit(unit);
                        const levelNo = D2Game.D2Common.GetLevelNoFromRoom(room);
                        const lvlbin = D2Game.D2Common.LevelGetLevelsBin(levelNo);

                        console.log([
                            '',
                            `ptr          = ${unit}`,
                            `type         = ${unit.Type}`,
                            `txtfileno    = ${unit.TxtFileNo}`,
                            `id           = ${unit.ID}`,
                            `code         = ${unit.ItemCode}`,
                            `code         = ${unit.ItemCodeString}`,
                            `name         = ${D2Game.D2Client.GetUnitName(unit)}`,
                            `pos          = ${pos.toString()}`,
                            `hp           = ${D2Game.D2Common.GetUnitStat(unit, types.D2StatID.HP)}`,
                            `lvlbin       = ${lvlbin}`,
                            `levelName    = ${lvlbin.LevelName}`,
                            `room2        = ${unit.Path.Room1}`,
                            '',
                        ].join('\n'));

                        return 0;
                    },
                    'uint32', ['pointer', 'pointer'], 'fastcall',
                ));
            });
        },

        enumItems() {
            D2Game.D2Common.enumInventoryItems(function(item: d2types.Unit) {
                const locatoin = D2Game.D2Common.InventoryGetItemLocation(item);
                if (locatoin != types.D2ItemLocation.Equipped)
                    return false;

                if (D2Game.D2Common.GetItemQuality(item) != types.D2ItemQuality.Unique)
                    return false;

                const itemCode = D2Game.D2Common.GetItemCodeString(item);
                utils.log(`<${itemCode}> ${D2Game.D2Client.GetUnitName(item)}`);

                return false;
            });
        },

        sellMagicBag() {
            const MagicBagCode = 'mbg ';

            let found = true;

            const timerid = setInterval(function() {
                if (!found) {
                    clearInterval(timerid);
                }

                found = false;

                D2Game.D2Common.enumInventoryItems(function(item: d2types.Unit): boolean {
                    if (D2Game.D2Common.InventoryGetItemLocation(item) != types.D2ItemLocation.Inventory)
                        return false;

                    const code = D2Game.D2Common.GetItemCodeString(item);
                    if (code != MagicBagCode)
                        return false;

                    const stats = D2Game.D2Common.GetUnitStatByFlags(item, 0x40);
                    if (stats.isNull())
                        return false;

                    const baseStat = stats.BaseStats;
                    if (baseStat.Count >= 6) {
                        return false;
                    }

                    let keepCount = 0;
                    for (let i = 0; i != baseStat.Count; i++) {
                        const st = baseStat.at(i);
                        keepCount += Number(st.Value.hexToString() != MagicBagCode);
                    }

                    if (keepCount != 0)
                        return false;

                    utils.log(`bag: ${baseStat} slots: ${keepCount} / ${baseStat.Count}, id: ${item.ID}`);

                    found = true;
                    D2Game.D2Client.npcSell(14, item.ID, 0);

                    return true;
                });

            }, 100);
        },
    };
}();
