import * as utils from '../utils';
import * as d2types from './d2types';
import { API } from '../modules';
import { ArrayBuffer2, Interceptor2 } from '../utils';
import { D2ClientCmd, D2GSCmd, D2SkillID, D2StateID, D2GSPacket, D2AreaID, D2ItemQuality, D2StringColor } from './types';
import { D2Game } from './game';

export interface ID2Addrs {
    D2Net: {
        ValidatePacket          : NativeFunction<number, [NativePointerValue, number, NativePointerValue]>;
        SendPacket              : NativeFunction<number, [number, number, NativePointerValue]>;
    }

    D2Client: {
        MouseX                  : NativePointer;
        MouseY                  : NativePointer;
        GameInfo                : NativePointer;

        GetPlayerUnit           : NativeFunction<NativePointer, []>;
        PrintGameString         : NativeFunction<void, [NativePointer, number]>;
        PrintPartyString        : NativeFunction<void, [NativePointer, number]>;
        GetLevelNameFromLevelNo : NativeFunction<NativePointer, [number]>;
    }

    D2Common: {
        ItemTable               : NativePointer;

        GetRoomFromUnit         : NativeFunction<NativePointer, [NativePointer]>;
        GetLevelNoFromRoom      : NativeFunction<number, [NativePointer]>;
        GetItemsBIN             : NativeFunction<NativePointer, [number]>;
        GetItemQuality          : NativeFunction<number, [NativePointer]>;
    }

    D2Lang: {
        GetStringFromIndex      : NativeFunction<NativePointer, [number]>;
    }
}

export class D2Base {
    private _addrs: ID2Addrs;

    constructor(addrs: ID2Addrs) {
        this._addrs = addrs
    }

    get addrs(): ID2Addrs {
        return this._addrs;
    }
}

export class D2Net extends D2Base {
    delaySend       : boolean = false;
    sendPending     : ArrayBuffer2[] = [];
    onRecvCallback  : ((packetId: D2GSCmd, payload: ArrayBuffer2) => void)[] = [];

    hook() {
        const D2Net_SendPacket = Interceptor2.jmp(
            this.addrs.D2Net.SendPacket,
            (size: number, arg2: number, buffer: NativePointer): number => {
                if (this.delaySend) {
                    utils.log(`delaySend: ${D2ClientCmd[buffer.readU8()]}`);

                    const p = Memory.alloc(size);

                    p.writeByteArray(buffer.readByteArray(size)!);
                    this.sendPending.push(utils.ptrToBytes(p, size));

                    return size;
                }

                this.onSendPacket(size, arg2, buffer);

                return D2Net_SendPacket(size, arg2, buffer);
            },
            'uint32', ['uint32', 'uint32', 'pointer'], 'stdcall',
        );

        const D2Net_ValidatePacket = Interceptor2.jmp(
            this.addrs.D2Net.ValidatePacket,
            (buffer: NativePointer, bufferSize: number, payloadSize: NativePointer): number => {
                const success = D2Net_ValidatePacket(buffer, bufferSize, payloadSize);

                if (success == 0)
                    return success;

                this.onValidatePacket(buffer, bufferSize, payloadSize);

                return success;
            },
            'uint32', ['pointer', 'uint32', 'pointer'], 'fastcall',
        );
    }

    addRecvCallback(fn: (packetId: D2GSCmd, payload: ArrayBuffer2) => void) {
        this.onRecvCallback.push(fn);
    }

    removeRecvCallback(fn: () => void) {
        const index = this.onRecvCallback.indexOf(fn);
        if (index != -1)
            this.onRecvCallback.splice(index, 1);
    }

    private onSendPacket(size: number, arg2: number, buf: NativePointer) {
        // return;
        const type = buf.readU8();

        function log(s: string) {
            return;

            if (!utils.Logging)
                return;

            const now = utils.getCurrentTime()
            const time = `[${now.getHours().pad(2)}:${now.getMinutes().pad(2)}:${now.getSeconds().pad(2)}.${now.getMilliseconds().pad(3)}]`;
            console.log(`${time} <${D2ClientCmd[type]}:${type.hex()}> <len:${size.hex()}> <unk:${arg2.hex()}> ${s}\n${hexdump(buf.readByteArray(size)!)}\n`);
        }

        switch (type) {
            case D2ClientCmd.RUNTOLOCATION:
            {
                const x = buf.add(1).readU16();
                const y = buf.add(3).readU16();

                log(`run to location: x = ${x}, y = ${y}`);
                break;
            }

            case D2ClientCmd.RUNTOENTITY:
            {
                const type = buf.add(1).readU32();
                const id = buf.add(5).readU32();

                log(`run to entity: type = ${type}, id = ${id}`);
                break;
            }

            case D2ClientCmd.LEFTSKILLONLOCATION:
            {
                const x = buf.add(1).readU16();
                const y = buf.add(3).readU16();

                log(`left skill on location: x = ${x}, y = ${y}`);
                break;
            }

            case D2ClientCmd.LEFTSKILLONENTITY:
            {
                const type = buf.add(1).readU32();
                const id = buf.add(5).readU32();

                log(`left skill on entity: type = ${type}, id = ${id}`);
                break;
            }

            case D2ClientCmd.LEFTSKILLONENTITYEX:
            {
                const type = buf.add(1).readU32();
                const id = buf.add(5).readU32();

                log(`left skill on entity ex: type = ${type}, id = ${id}`);
                break;
            }

            case D2ClientCmd.LEFTSKILLONLOCATIONEX:
            {
                const x = buf.add(1).readU16();
                const y = buf.add(3).readU16();

                log(`left skill on location ex: x = ${x}, y = ${y}`);
                break;
            }

            case D2ClientCmd.LEFTSKILLONENTITYEX2:
            {
                const type = buf.add(1).readU32();
                const id = buf.add(5).readU32();

                log(`left skill on entity ex 2: type = ${type}, id = ${id}`);
                break;
            }

            case D2ClientCmd.LEFTSKILLONENTITYEX3:
            {
                const type = buf.add(1).readU32();
                const id = buf.add(5).readU32();

                log(`left skill on entity ex 3: type = ${type}, id = ${id}`);
                break;
            }

            case D2ClientCmd.RIGHTSKILLONLOCATION:
            {
                const x = buf.add(1).readU16();
                const y = buf.add(3).readU16();

                log(`right click on location: x = ${x}, y = ${y}`);
                break;
            }

            case D2ClientCmd.RIGHTSKILLONENTITY:
            {
                const type = buf.add(1).readU32();
                const id = buf.add(5).readU32();

                log(`right skill on entity: type = ${type}, id = ${id}`);
                break;
            }

            case D2ClientCmd.RIGHTSKILLONLOCATIONEX:
            {
                const x = buf.add(1).readU16();
                const y = buf.add(3).readU16();

                log(`right click on location ex: x = ${x}, y = ${y}`);
                break;
            }

            case D2ClientCmd.RIGHTSKILLONENTITYEX2:
            {
                const type = buf.add(1).readU32();
                const id = buf.add(5).readU32();

                log(`right skill on entity ex 2: type = ${type}, id = ${id}`);
                break;
            }

            case D2ClientCmd.INTERACTWITHENTITY:
            {
                const type = buf.add(1).readU32();
                const id = buf.add(5).readU32();

                log(`interact with entity: type = ${type}, id = ${id}`);
                break;
            }

            case D2ClientCmd.PICKUPITEM:
            {
                const type = buf.add(1).readU32();
                const unit = buf.add(5).readU32();
                const action = buf.add(9).readU32();

                log(`pickup item: type = ${type}, unit = ${unit}, action = ${action}`);
                break;
            }

            case D2ClientCmd.DROPITEM:
            {
                const id = buf.add(1).readU32();

                log(`drop item: id = ${id}`);
                break;
            }

            case D2ClientCmd.ITEMTOBUFFER:
            {
                const id = buf.add(1).readU32();
                const x = buf.add(5).readU32();
                const y = buf.add(9).readU32();
                const type = buf.add(13).readU32();

                log(`item to buffer: id = ${id}, x = ${x}, y = ${y}, type = ${type}`);
                break;
            }

            case D2ClientCmd.PICKUPBUFFERITEM:
            {
                const id = buf.add(1).readU32();

                log(`pickup buffer item: id = ${id}`);
                break;
            }

            case D2ClientCmd.SWITCHINVENTORYITEM:
            {
                const id_inventory = buf.add(1).readU32();
                const id_replace = buf.add(5).readU32();
                const x = buf.add(9).readU32();
                const y = buf.add(13).readU32();

                log(`switch inventory item: id_inventory = ${id_inventory}, id_replace = ${id_replace}, x = ${x}, y = ${y}`);
                break;
            }

            case D2ClientCmd.USEITEM:
            {
                const id = buf.add(1).readU32();
                const x = buf.add(5).readU32();
                const y = buf.add(9).readU32();

                log(`use item: id = ${id}, x = ${x}, y = ${y}`);
                break;
            }

            case D2ClientCmd.NPC_INIT:
            {
                const type = buf.add(1).readU32();
                const id = buf.add(5).readU32();

                log(`npc init: type = ${type}, id = ${id}`);
                break;
            }

            case D2ClientCmd.NPC_CANCEL:
            {
                const type = buf.add(1).readU32();
                const id = buf.add(5).readU32();

                log(`npc cancel: type = ${type}, id = ${id}`);
                break;
            }

            case D2ClientCmd.NPC_SELL:
            {
                const id_npc = buf.add(1).readU32();
                const id_item = buf.add(5).readU32();
                const type = buf.add(9).readU32();
                const cost = buf.add(13).readU32();

                log(`npc sell: id_npc = ${id_npc}, id_item = ${id_item}, type = ${type}, cost = ${cost}`);
                break;
            }

            case D2ClientCmd.NPC_IDENTIFYITEMS:
            {
                const id = buf.add(1).readU32();

                log(`cain identify: id = ${id}`);
                break;
            }

            case D2ClientCmd.REPAIR:
            {
                const id1 = buf.add(1).readU32();
                const id2 = buf.add(5).readU32();
                const id3 = buf.add(9).readU32();
                const id4 = buf.add(13).readU32();

                log(`repair: id1 = ${id1}, id2 = ${id2}, id3 = ${id3}, id4 = ${id4}`);
                break;
            }

            case D2ClientCmd.ENTITYACTION:
            {
                const type    = buf.add(1).readU32();
                const id      = buf.add(5).readU32();
                const unk1    = buf.add(9).readU32();

                log(`npc trade: type = ${type}, id = ${id}, unk1 = ${unk1.hex()}`);
                break;
            }

            case D2ClientCmd.SELECTSKILL:
            {
                const skillId = buf.add(1).readU16();
                const hand = buf.add(4).readU8();
                const itemId = buf.add(5).readU32();

                log(`switch skill: skillId = ${skillId.hex()}, hand = ${hand.hex()}, itemId = ${itemId.hex()}`);
                break;
            }

            case D2ClientCmd.CHARACTERPHRASE:
            {
                const id = buf.add(1).readU16();

                log(`character phrase: id = ${id.hex()}`);
                break;
            }

            case D2ClientCmd.WAYPOINT:
            {
                const id      = buf.add(1).readU8();
                const unk1    = buf.add(2).readU8();
                const unk2    = buf.add(3).readU16();
                const level   = buf.add(5).readU8();
                const unk3    = buf.add(6).readU16();
                const unk4    = buf.add(8).readU8();

                log(`way point: id = ${id.hex()}, unk1 = ${unk1.hex()}, unk2 = ${unk2.hex()}, level = ${level.hex()}, unk3 = ${unk3.hex()}, unk4 = ${unk4.hex()}`);
                break;
            }

            case D2ClientCmd.MAKEENTITYMOVE:
            {
                const unk1 = buf.add(1).readU32();
                const unk2 = buf.add(5).readU32();
                const unk3 = buf.add(9).readU32();
                const unk4 = buf.add(13).readU32();

                log(`town folk: unk1 = ${unk1.hex()}, unk2 = ${unk2.hex()}, unk3 = ${unk3.hex()}, unk4 = ${unk4.hex()}`);
                break;
            }

            case D2ClientCmd.UPDATEPLAYERPOS:
            {
                const pos = buf.add(1).readU32();
                const x = pos & 0xFFFF;
                const y = pos >> 16;
                log(`update position: pos = ${pos.hex()} x = ${x}, y = ${y}`);
                break;
            }

            case D2ClientCmd.SWAPWEAPON:
            {
                log('switch equip');
                break;
            }

            case D2ClientCmd.GAMELOGON_MULTI:
            {
                const hash        = buf.add(1).readU32();
                const token       = buf.add(5).readU16();
                const charid      = buf.add(7).readU8();
                const ver         = buf.add(8).readU32();
                const unk1        = buf.add(12).readU32();
                const unk2        = buf.add(16).readU32();
                const unk3        = buf.add(20).readU8();
                const charname    = buf.add(21).readUtf8String();

                log(`game logon: hash = ${hash.hex()}, token = ${token.hex()}, charid = ${charid.hex()}, ver = ${ver.hex()}, unk1 = ${unk1.hex()}, unk2 = ${unk2.hex()}, unk3 = ${unk3.hex()}, charname = ${charname}`);
                break;
            }

            case D2ClientCmd.LEAVEGAME:
            {
                log('game exit');
                break;
            }

            case D2ClientCmd.JOINGAME:
            {
                log('enter game environment');
                break;
            }

            case D2ClientCmd.PING:
            {
                // log('ping');
                break;
            }

            default:
            {
                const buf2 = buf.readByteArray(size);
                if (utils.Logging) {
                    log(` unknown = ${arg2.hex()}, size = ${size}\n${hexdump(buf2!)}`);
                }
                break;
            }
        }
    }

    private onValidatePacket(buffer: NativePointer, bufferSize: number, payloadSize: NativePointer) {
        const packetId = buffer.readU8();
        const payload = utils.ptrToBytes(buffer, payloadSize.readU32() ? payloadSize.readU32() : bufferSize);

        this.onReceivePacket(packetId, payload)

        switch (packetId) {
            case D2GSCmd.MAPREVEAL:
            case D2GSCmd.MAPHIDE:
            case D2GSCmd.PONG:
            case D2GSCmd.NPC_MOVE:
            case D2GSCmd.NPC_STOP:
            case D2GSCmd.NPC_ACTION:
            case D2GSCmd.NPC_STATE:
            case D2GSCmd.NPC_HIT:
            case D2GSCmd.NPC_HEAL:
            case D2GSCmd.NPC_MOVETOENTITY:
            case D2GSCmd.NPC_ATTACK:
            case D2GSCmd.NPC_INFO:
            case D2GSCmd.RELATOR1:
            case D2GSCmd.RELATOR2:
            case D2GSCmd.DARKNESS:
            case D2GSCmd.HPMPUPDATE:
            case D2GSCmd.REMOVEOBJECT:
            case D2GSCmd.WORLDOBJECT:
            case D2GSCmd.MONSTERPACKET:
            case D2GSCmd.ITEM_WORLD:
            case D2GSCmd.MULTISTATES:
            case D2GSCmd.OBJECTSTATE:
            case D2GSCmd.ITEM_OWNED:
            case D2GSCmd.UPDATEITEM_OSKILL:
            case D2GSCmd.UNITCASTSKILL_TARGET:
            case D2GSCmd.CHAT:
            case D2GSCmd.EVENTMESSAGES:
            case D2GSCmd.PLAYERKILLCOUNT:
            case D2GSCmd.ADDEXP_BYTE:
            case D2GSCmd.ADDEXP_WORD:
            case D2GSCmd.ADDEXP_DWORD:
            case D2GSCmd.SETATTR_BYTE:
            case D2GSCmd.SETATTR_WORD:
            case D2GSCmd.SETATTR_DWORD:
            case D2GSCmd.PLAYERINPROXIMITY:
            case D2GSCmd.MERCREVIVECOST:
            case D2GSCmd.GAME_QUESTS_AVAILABILITY:
            case D2GSCmd.PLAYERQUESTINFO:
            case D2GSCmd.GAMEQUESTLOG:
            case D2GSCmd.PORTAL_FLAGS:
            case D2GSCmd.ASSIGNHOTKEY:
            case D2GSCmd.CMNCOF:
            case D2GSCmd.ASSIGNPLAYERTOPARTY:
            case D2GSCmd.LOADACT:

            // case D2GSCmd.SETSTATE:
            // case D2GSCmd.DELAYSTATE:
            // case D2GSCmd.ENDSTATE:
                // break;
                return;
        }

        // utils.log(`ValidatePacket: ${D2GSCmd[packetId]}\n${hexdump(payload)}\n`);
    }

    flushSendPending() {
        // utils.log('flushSendPending');

        const sendPending = this.sendPending.splice(0);

        this.delaySend = false;

        for (let p of sendPending) {
            this.SendPacket(p);
        }

        // utils.log('flushSendPending end');
    }

    SendPacket(packet: ArrayBuffer2) {
        // if (!D2Game.D2Client.gameLoaded)
        //     return;

        const delaySend = this.delaySend;
        this.delaySend = false;

        const ret = this.addrs.D2Net.SendPacket(packet.byteLength, 1, packet.ptr);

        this.delaySend = delaySend;

        return ret;
    }

    onReceivePacket(packetId: D2GSCmd, payload: ArrayBuffer2) {
        switch (packetId) {
            case D2GSCmd.MAPREVEAL:
                // this.onMapReveal(new D2GSPacket.MapReveal(payload.ptr));
                break;

            case D2GSCmd.SETSKILL:
                this.onSetSkill(new D2GSPacket.SetSkill(payload.ptr));
                break;

            case D2GSCmd.SETSTATE:
            case D2GSCmd.DELAYSTATE:
                this.onSetState(new D2GSPacket.SetState(payload.ptr));
                break;

            case D2GSCmd.ENDSTATE:
                this.onEndState(new D2GSPacket.EndState(payload.ptr));
                break;

            case D2GSCmd.WALKVERIFY:
                this.onWalkVerify(new D2GSPacket.WalkVerify(payload.ptr));
                break;

            case D2GSCmd.REASSIGNPLAYER:
                this.onReassignPlayer(new D2GSPacket.ReassignPlayer(payload.ptr));
                break;

            case D2GSCmd.LOADSUCCESSFUL:
                D2Game.D2Client.joinGame();
                break;

            case D2GSCmd.GAMEEXIT:
                D2Game.D2Client.exitGame();
                break;
        }

        for (let cb of this.onRecvCallback) {
            cb(packetId, payload);
        }
    }

    onMapReveal(map: D2GSPacket.MapReveal) {
        const areaID = D2Game.D2Common.getCurrentAreaID();
        D2Game.D2Client.areaID = areaID;
    }

    onSetSkill(skill: D2GSPacket.SetSkill) {
        if (skill.leftHand) {
            D2Game.D2Client.leftSkill = skill.skillId;
        } else {
            D2Game.D2Client.rightSkill = skill.skillId;
        }
    }

    onSetState(state: D2GSPacket.SetState) {
        switch (state.state) {
            case D2StateID.SkillCooldown:
            case D2StateID.Hurricane:
                utils.log(`set state: ${state.state.hex()}`);
                D2Game.D2Client.addState(state.state);
                break;
        }
    }

    onEndState(state: D2GSPacket.EndState) {
        if (D2Game.D2Client.removeState(state.state)) {
            utils.log(`remove state: ${state.state.hex()}`);
        }
    }

    onWalkVerify(walk: D2GSPacket.WalkVerify) {
        // utils.log(`walk verify: ${walk.x}, ${walk.y}`);
        D2Game.D2Client.playerLocation = {x: walk.x, y: walk.y};
    }

    onReassignPlayer(player: D2GSPacket.ReassignPlayer) {
        // utils.log(`reassign player: ${player.x}, ${player.y}`);
        D2Game.D2Client.playerLocation = {x: player.x, y: player.y};
    }
}

export class D2Client extends D2Base {
    gameLoaded      : boolean   = false;
    gameJoinTime    : number    = 0;
    leftSkill       : number    = 0;
    rightSkill      : number    = 0;
    activeStates    : number[]  = [];
    areaID          : number    = 0;
    playerLocation  : {x: number, y: number} = {x: 0, y: 0};
    queue           : (() => void)[] = [];

    hook() {
        const mainThreadId = Process.enumerateThreads()[0].id;

        const PeekMessageA = Interceptor2.jmp(
            API.USER32.PeekMessageA,
            (msg: NativePointer, hWnd: NativePointer, msgFilterMin: number, msgFilterMax: number, removeMsg: number): number => {
                const success = PeekMessageA(msg, hWnd, msgFilterMin, msgFilterMax, removeMsg);

                if (!success && mainThreadId == Process.getCurrentThreadId()) {
                    this.messageLoop();
                }

                return success;
            },
            'int32', ['pointer', 'pointer', 'uint32', 'uint32', 'uint32'], 'stdcall',
        );
    }

    get MousePos() {
        return {
            X: this.addrs.D2Client.MouseX.readU32(),
            Y: this.addrs.D2Client.MouseY.readU32(),
        };
    }

    get GameInfo(): d2types.GameInfo | undefined {
        const p = this.addrs.D2Client.GameInfo.readPointer();
        return p.isNull() ? undefined : new d2types.GameInfo(p);
    }

    GetLevelNameFromLevelNo(levelNo: number): string {
        const s = this.addrs.D2Client.GetLevelNameFromLevelNo(levelNo);
        return s.isNull() ? '<None>' : s.readUtf16String()!;
    }

    PrintGameString(msg: string, color: D2StringColor = D2StringColor.Default) {
        const s = utils.UTF16(msg);
        const len = msg.length * 2;
        const ch$ = 0x24;

        for (let i = 2; i < len; i += 2) {
            if (s.add(i).readU16() == ch$ && s.add(i - 2).readU16() == ch$) {
                s.add(i - 2).writeU32(0x006300FF);
            }
        }

        this.addrs.D2Client.PrintGameString(s, color);
    }

    PrintPartyString(msg: string, color: D2StringColor = D2StringColor.Default) {
        const s = utils.UTF16(msg);
        this.addrs.D2Client.PrintPartyString(s, color);
    }

    hasState(state: number): boolean {
        return this.activeStates.indexOf(state) != -1;
    }

    addState(state: number) {
        if (!this.hasState(state))
            this.activeStates.push(state);
    }

    removeState(state: number): boolean {
        const index = this.activeStates.indexOf(state);
        if (index == -1) {
            return false;
        }

        this.activeStates.splice(index, 1);
        return true;
    }

    leftSkillOnLocation(x: number, y: number) {
        const SIZE = 5;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.LEFTSKILLONLOCATION);
        payload.add(0x01).writeU16(x);
        payload.add(0x03).writeU16(y);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE))
    }

    leftSkillOnLocationEx(x: number, y: number) {
        const SIZE = 5;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.LEFTSKILLONLOCATIONEX);
        payload.add(0x01).writeU16(x);
        payload.add(0x03).writeU16(y);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE))
    }

    selectSkill(lefthand: boolean, skillId: number) {
        const SIZE = 9;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.SELECTSKILL);
        payload.add(0x01).writeU16(skillId);
        payload.add(0x03).writeU8(0);
        payload.add(0x04).writeU8(lefthand ? 0x80 : 0x00);
        payload.add(0x05).writeU32(0xFFFFFFFF);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE))
    }

    joinGame() {
        this.queue = [];
        this.gameLoaded = true;
        this.gameJoinTime = utils.getCurrentTime().getTime();
    }

    exitGame() {
        this.gameLoaded     = false;
        this.gameJoinTime   = 0;
        this.leftSkill      = 0;
        this.rightSkill     = 0;
        this.activeStates   = [];
        this.areaID         = 0;
        this.playerLocation = {x: 0, y: 0};
        this.queue          = [];
    }

    scheduleOnMainThread(fn: () => void) {
        this.queue.push(fn);
    }

    messageLoop() {
        // utils.log('messageLoop');

        const queue = this.queue.splice(0);

        if (queue.length == 0)
            return;

        // utils.log('messageLoop start');

        for (let fn of queue) {
            fn();
        }

        // utils.log('messageLoop end');
    }
}

export class D2Common extends D2Base {
    get ItemTable(): d2types.ItemTable {
        return new d2types.ItemTable(this.addrs.D2Common.ItemTable);
    }

    GetItemsBIN(itemId: number): d2types.ItemsBIN {
        return new d2types.ItemsBIN(this.addrs.D2Common.GetItemsBIN(itemId));
    }

    GetItemQuality(item: NativePointer): D2ItemQuality {
        return this.addrs.D2Common.GetItemQuality(item);
    }

    getCurrentAreaID(): D2AreaID {
        const player = this.addrs.D2Client.GetPlayerUnit();
        if (player.isNull())
            return D2AreaID.None;

        const room = this.addrs.D2Common.GetRoomFromUnit(player);
        if (room.isNull())
            return D2AreaID.None;

        const levelno = this.addrs.D2Common.GetLevelNoFromRoom(room);

        return levelno;
    }
}

export class D2Lang extends D2Base {
    GetStringFromIndex(index: number): string {
        const s = this.addrs.D2Lang.GetStringFromIndex(index);
        return s.isNull() ? '<None>' : s.readUtf16String()!;
    }
}

// export class D2Duck {
//     base: NativePointer;

//     constructor(base: NativePointer) {
//         this.base = base;
//     }

//     get GameJoinTime(): number {
//         return this.base.add(0x3AB4484 - 0x35B1000).readU32();
//     }
// }
