import * as utils from '../utils';
import * as types from './types';
import * as d2types from './d2types';
import { API } from '../modules';
import { ArrayBuffer2, Interceptor2 } from '../utils';
import { D2CollisionFlags, D2ClientCmd, D2GSCmd, D2SkillID, D2StateID, D2GSPacket, D2LevelNo, D2StringColor, D2UnitType } from './types';
import { ID2Addrs, D2Net, D2Client, D2Common, D2Multi, D2Lang } from './d2module';
import { D2DuckPatch } from './patch/D2Duck';
import { InternalPatch } from './patch/internal';
import * as moduleloader from './module/loader';

class HurricaneMonitor {
    _active         = false;
    _disabled       = false;
    duration        = 0;
    startTime       = 0;
    nextCastTime    = 0;
    actionQueue: HurricaneMonitor.Action[] = [];

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
        let timerId: NodeJS.Timer | undefined = undefined;

        const RetryInterval           = 500;
        const MaxRetryTimes           = 10;
        const MaxAutoCastRetryTimes   = 2;

        const nextAction = () => {
            const a = this.actionQueue.pop();
            return a === undefined ? HurricaneMonitor.Action.Idle : a;
        }

        const setAutoCastTime = (now: number, reset = false) => {
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

        Module.load('D2Duck.dll');

        this.addrs = addrs;
        this.installPatches();

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

        this.loadModules();
    }

    hook() {
        this._D2Net?.hook();
        this._D2Client?.hook();
    }

    getD2Duck() {
        return D2DuckPatch.getD2Duck();
    }

    installPatches() {
        new D2DuckPatch().install();
        new InternalPatch().install();
    }

    loadModules() {
        moduleloader.loadModules();
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
                const player = D2Game.D2Client.GetPlayerUnit();

                D2Game.D2Client.SetUIVars(types.D2UIVars.NpcMenu, 1, 0);

                const cube = D2Game.D2Common.findCube();
                D2Game.D2Client.useItem(cube!.ID);

                return;
                const playerPos = D2Game.D2Common.Unit.getUnitCoord(player);
                const target = new d2types.Unit(0x15b66c00);
                const targetPos = D2Game.D2Common.Unit.getUnitCoord(target);

                const pos1 = D2Game.D2Common.Unit.getCoordByDistance(playerPos, targetPos, 30);
                const pos2 = D2Game.D2Common.Unit.getCoordByDistance(playerPos, targetPos, 3);
                const mask = D2CollisionFlags.Wall | D2CollisionFlags.BlockPlayer | D2CollisionFlags.Door;
                const room = D2Game.D2Common.Room.GetRoomFromUnit(player);

                utils.log(pos1);
                utils.log(pos2);

                utils.log(D2Game.D2Common.Collision.CheckMaskWithSizeXY(room, pos1.x, pos1.y, 1, 1, D2CollisionFlags.AllMask));
                utils.log(D2Game.D2Common.Collision.CheckMaskWithSizeXY(room, pos2.x, pos2.y, 1, 1, D2CollisionFlags.AllMask));

                // const mask = D2Game.D2Common.Collision.CheckMaskWithSizeXY(D2Game.D2Common.Room.GetRoomFromUnit(player), pos.x, pos.y, 1, 1, D2CollisionFlags.AllMask);
                // utils.log(mask.hex());

                return;
            });
        },

        findUnit(id: number) {
            D2Game.D2Client.scheduleOnMainThread(() => {
                const item = D2Game.D2Client.FindClientSideUnit(id, D2UnitType.Item);
                if (item.isNull())
                    return;

                utils.log(`${item} ${item.ID} ${D2Game.D2Client.GetUnitName(item)}`);
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
            const bin   = D2Game.D2Common.Item.GetItemsBin(txtFileno);
            const name  = D2Game.D2Lang.GetLocaleText(bin.NameStrIndex);

            utils.log(name);
        },

        printLocaleText(id: number) {
            utils.log(D2Game.D2Lang.GetLocaleText(id));
        },

        enumUnits(range = 5) {
            D2Game.D2Client.scheduleOnMainThread(function() {
                const player = D2Game.D2Client.GetPlayerUnit();
                const coord = D2Game.D2Common.Unit.getUnitCoord(player);
                D2Game.D2Common.Unit.FindNearestUnitFromPos(player, coord.x, coord.y, range, new NativeCallback(
                    (target: NativePointer): number => {
                        const unit = new d2types.Unit(target);

                        if (unit.Type == D2UnitType.Player)
                            return 0;

                        const coord = D2Game.D2Common.Unit.getUnitCoord(unit);
                        const room = D2Game.D2Common.Room.GetRoomFromUnit(unit);
                        const levelNo = D2Game.D2Common.Room.GetLevelNoFromRoom(room);
                        const lvlbin = D2Game.D2Common.Level.GetLevelsBin(levelNo);

                        console.log([
                            '',
                            `ptr          = ${unit}`,
                            `type         = ${unit.Type}`,
                            `txtfileno    = ${unit.TxtFileNo}`,
                            `id           = ${unit.ID}`,
                            `code         = ${unit.ItemCode}`,
                            `code         = ${unit.ItemCodeString}`,
                            `name         = ${D2Game.D2Client.GetUnitName(unit)}`,
                            `coord        = ${coord.toString()}`,
                            `hp           = ${D2Game.D2Common.Unit.GetUnitStat(unit, types.D2StatID.HP)}`,
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
                const locatoin = D2Game.D2Common.Inventory.GetItemInvPage(item);
                if (locatoin != types.D2ItemInvPage.Equip)
                    return false;

                if (D2Game.D2Common.Item.GetItemQuality(item) != types.D2ItemQuality.Unique)
                    return false;

                const itemCode = D2Game.D2Common.Item.GetItemCodeString(item);
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
                    if (D2Game.D2Common.Inventory.GetItemInvPage(item) != types.D2ItemInvPage.Inventory)
                        return false;

                    const code = D2Game.D2Common.Item.GetItemCodeString(item);
                    if (code != MagicBagCode)
                        return false;

                    const stats = D2Game.D2Common.Unit.GetUnitStatByFlags(item, 0x40);
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

        printCursorItem() {
            D2Game.D2Client.scheduleOnMainThread(() => {
                const player = D2Game.D2Client.GetPlayerUnit();
                const inv = player.Inventory;
                const item = D2Game.D2Common.Inventory.GetCursorItem(inv);

                if (item.isNull())
                    return;

                const duck = D2Game.getInstance().getD2Duck()!
                const info = Memory.alloc(0x2C);

                info.writePointer(player.Inventory);
                info.add(0x04).writePointer(player);
                info.add(0x08).writePointer(player);
                info.add(0x0C).writePointer(player);
                info.add(0x10).writePointer(item);
                info.add(0x14).writeU32(0xE);
                info.add(0x18).writeU32(1);

                const bufsize = 0x800;
                const buf = Memory.alloc(bufsize * 2);

                duck.ItemText.FormatItemProperties(info, buf, bufsize, 0, 0);

                const lines = [
                    '',
                    `ptr: ${item} ${item.ID}`,
                    `code: ${D2Game.D2Common.Item.GetItemCodeString(item)}`,
                    `quality: ${D2Game.D2Common.Item.GetItemQuality(item)}`,
                    buf.readUtf16String()!.split('\n').reverse().join('\n'),
                ];

                utils.log(lines.join('\n'));
            });
        },
    };
}();
