import * as utils from '../utils';
import { ArrayBuffer2, Interceptor2 } from '../utils';
import { D2Game } from './game';
import { D2Base } from './d2base';
import {
    D2ClientCmd,
    D2GSCmd,
    D2GSPacket,
} from './types';

export class D2Net extends D2Base {
    delaySend       = false;
    sendPending     : ArrayBuffer2[] = [];
    sendCallbacks   : ((packetId: D2ClientCmd, payload: ArrayBuffer2) => void)[] = [];
    recvCallbacks   : ((packetId: D2GSCmd, payload: ArrayBuffer2) => void)[] = [];
    mainThreadId    = 0;

    hook() {
        this.mainThreadId = Process.enumerateThreads()[0].id;

        const D2Net_SendPacket = Interceptor2.jmp(
            this.addrs.D2Net.SendPacket,
            (size: number, arg2: number, buffer: NativePointer): number => {
                if (this.delaySend) {
                    const packetId = buffer.readU8();

                    if (this.shouldDelaySend(packetId)) {
                        utils.log(`delaySend: ${D2ClientCmd[packetId]}`);

                        const p = Memory.alloc(size);

                        p.writeByteArray(buffer.readByteArray(size)!);
                        this.sendPending.push(utils.ptrToBytes(p, size));

                        return size;
                    }
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

                if (success == 0 || Process.getCurrentThreadId() != this.mainThreadId)
                    return success;

                this.onValidatePacket(buffer, bufferSize, payloadSize);

                return success;
            },
            'uint32', ['pointer', 'uint32', 'pointer'], 'fastcall',
        );
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

    shouldDelaySend(packetId: D2ClientCmd): boolean {
        switch (packetId) {
            case D2ClientCmd.WALKTOLOCATION:
            case D2ClientCmd.WALKTOENTITY:
            case D2ClientCmd.RUNTOLOCATION:
            case D2ClientCmd.RUNTOENTITY:
            case D2ClientCmd.LEFTSKILLONLOCATION:
            case D2ClientCmd.LEFTSKILLONENTITY:
            case D2ClientCmd.LEFTSKILLONENTITYEX:
            case D2ClientCmd.LEFTSKILLONLOCATIONEX:
            case D2ClientCmd.LEFTSKILLONENTITYEX2:
            case D2ClientCmd.LEFTSKILLONENTITYEX3:
            case D2ClientCmd.RIGHTSKILLONLOCATION:
            case D2ClientCmd.RIGHTSKILLONENTITY:
            case D2ClientCmd.RIGHTSKILLONENTITYEX:
            case D2ClientCmd.RIGHTSKILLONLOCATIONEX:
            case D2ClientCmd.RIGHTSKILLONENTITYEX2:
            case D2ClientCmd.RIGHTSKILLONENTITYEX3:
            case D2ClientCmd.SWAPWEAPON:
            // case D2ClientCmd.PICKUPITEM:
            // case D2ClientCmd.DROPITEM:
            // case D2ClientCmd.ITEMTOBUFFER:
            // case D2ClientCmd.PICKUPBUFFERITEM:
            // case D2ClientCmd.ITEMTOBODY:
            // case D2ClientCmd.SWAP2HANDEDITEM:
            // case D2ClientCmd.PICKUPBODYITEM:
            // case D2ClientCmd.SWITCHBODYITEM:
            // case D2ClientCmd.SWITCH1H_2H:
            // case D2ClientCmd.SWITCHINVENTORYITEM:
                return true;

            default:
                return false;
        }
    }

    onSend(fn: (packetId: D2ClientCmd, payload: ArrayBuffer2) => void) {
        this.sendCallbacks.push(fn);
    }

    onRecv(fn: (packetId: D2GSCmd, payload: ArrayBuffer2) => void) {
        this.recvCallbacks.push(fn);
    }

    private onSendPacket(size: number, arg2: number, buf: NativePointer) {
        const packetId: D2ClientCmd = buf.readU8();

        switch (packetId) {
            case D2ClientCmd.LEAVEGAME:
                D2Game.D2Client.exitGame();
                break;
        }

        if (this.sendCallbacks.length != 0) {
            const payload = utils.ptrToBytes(buf, size);
            for (const cb of this.sendCallbacks) {
                cb(packetId, payload)
            }
        }

        return;

        function log(s: string) {
            if (!utils.Logging)
                return;

            const now = utils.getCurrentTime()
            const time = `[${now.getHours().pad(2)}:${now.getMinutes().pad(2)}:${now.getSeconds().pad(2)}.${now.getMilliseconds().pad(3)}]`;
            console.log(`${time} <${D2ClientCmd[packetId]}:${packetId.hex()}> <len:${size.hex()}> <unk:${arg2.hex()}> ${s}\n${hexdump(buf.readByteArray(size)!)}\n`);
        }

        switch (packetId) {
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
                // const buf2 = buf.readByteArray(size);
                if (utils.Logging) {
                    log(` unknown = ${arg2.hex()}, size = ${size}`);
                }
                break;
            }
        }
    }

    onReceivePacket(packetId: D2GSCmd, payload: ArrayBuffer2) {
        switch (packetId) {
            case D2GSCmd.MAPREVEAL:
                // this.onMapReveal(new D2GSPacket.MapReveal(payload.ptr));
                break;

            case D2GSCmd.SETSKILL:
                D2Game.D2Client.onSetSkill(new D2GSPacket.SetSkill(payload.ptr));
                break;

            case D2GSCmd.SETSTATE:
            case D2GSCmd.DELAYSTATE:
                D2Game.D2Client.onSetState(new D2GSPacket.SetState(payload.ptr));
                break;

            case D2GSCmd.ENDSTATE:
                D2Game.D2Client.onEndState(new D2GSPacket.EndState(payload.ptr));
                break;

            case D2GSCmd.WALKVERIFY:
                D2Game.D2Client.onWalkVerify(new D2GSPacket.WalkVerify(payload.ptr));
                break;

            case D2GSCmd.REASSIGNPLAYER:
                D2Game.D2Client.onReassignPlayer(new D2GSPacket.ReassignPlayer(payload.ptr));
                break;

            case D2GSCmd.LOADSUCCESSFUL:
                D2Game.D2Client.joinGame();
                break;

            case D2GSCmd.GAMEEXIT:
                D2Game.D2Client.exitGame();
                break;
        }

        for (const cb of this.recvCallbacks) {
            cb(packetId, payload);
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
            // case D2GSCmd.DARKNESS:
            // case D2GSCmd.HPMPUPDATE:
            case D2GSCmd.REMOVEOBJECT:
            // case D2GSCmd.WORLDOBJECT:
            // case D2GSCmd.MONSTERPACKET:
            // case D2GSCmd.ITEM_WORLD:
            // case D2GSCmd.MULTISTATES:
            // case D2GSCmd.OBJECTSTATE:
            // case D2GSCmd.ITEM_OWNED:
            // case D2GSCmd.UPDATEITEM_OSKILL:
            // case D2GSCmd.UNITCASTSKILL_TARGET:
            // case D2GSCmd.CHAT:
            // case D2GSCmd.EVENTMESSAGES:
            // case D2GSCmd.PLAYERKILLCOUNT:
            // case D2GSCmd.ADDEXP_BYTE:
            // case D2GSCmd.ADDEXP_WORD:
            // case D2GSCmd.ADDEXP_DWORD:
            // case D2GSCmd.SETATTR_BYTE:
            // case D2GSCmd.SETATTR_WORD:
            // case D2GSCmd.SETATTR_DWORD:
            // case D2GSCmd.PLAYERINPROXIMITY:
            // case D2GSCmd.MERCREVIVECOST:
            // case D2GSCmd.GAME_QUESTS_AVAILABILITY:
            // case D2GSCmd.PLAYERQUESTINFO:
            // case D2GSCmd.GAMEQUESTLOG:
            // case D2GSCmd.PORTAL_FLAGS:
            // case D2GSCmd.ASSIGNHOTKEY:
            // case D2GSCmd.CMNCOF:
            // case D2GSCmd.ASSIGNPLAYERTOPARTY:
            // case D2GSCmd.LOADACT:

            // case D2GSCmd.SETSTATE:
            // case D2GSCmd.DELAYSTATE:
            // case D2GSCmd.ENDSTATE:
                // break;
                return;
        }

        // utils.log(`ValidatePacket: ${D2GSCmd[packetId]}\n${hexdump(payload)}\n`);

        // switch (packetId) {
        //     case D2GSCmd.ITEM_WORLD:
        //     {
        //         const action = buffer.add(1).readU8();
        //         const catalog = buffer.add(3).readU8();
        //         const unitId = buffer.add(4).readU32();
        //         utils.log(`ITEM_WORLD: action = ${action}, catalog = ${catalog}, unitId = ${unitId}`);
        //         break;
        //     }
        // }
    }

    discardSendPending() {
        D2Game.D2Client.scheduleOnMainThread(() => {
            this.sendPending.splice(0);
        });
    }

    flushSendPending() {
        D2Game.D2Client.scheduleOnMainThread(() => {
            this.delaySend = false;

            const sendPending = this.sendPending.splice(0);

            for (const p of sendPending) {
                this.SendPacket(p);
            }
        });
    }
}