import * as utils from '../utils';
import * as d2types from './d2types';
import { API, Modules } from '../modules';
import { Interceptor2 } from '../utils';
import { D2Game } from './game';
import { Task, AbortController } from '../task';
import { D2Base } from './d2base';
import {
    D2ClientCmd,
    D2StateID,
    D2GSPacket,
    D2StringColor,
    D2UnitType,
    D2SkillID,
    D2ItemInvPage,
    D2UIVars,
} from './types';

interface ICommandHandler {
    handleCommand(args: string[]): Promise<boolean>;
}

export class D2Client extends D2Base {
    gameLoaded      = false;
    gameJoinTime    = 0;
    leftSkill       = 0;
    rightSkill      = 0;
    activeStates    = new Set<number>;
    levelNo         = 0;
    playerLocation  = d2types.Coord.default();
    gameWindow      = NULL;
    gameWindowProc  = new NativeFunction(NULL, 'pointer', ['pointer', 'uint32', 'pointer', 'pointer']);

    mainThreadId    = 0;
    mainThreadCallbacks : (() => void)[] = [];
    idleLoopCallbacks   : (() => void)[] = [];
    keyDownCallbacks    : ((vk: number) => void)[] = [];
    commandHandler      : {[cmd: string]: ICommandHandler} = {};

    hook() {
        this.mainThreadId = Process.enumerateThreads()[0].id;

        const PeekMessageA = Interceptor2.jmp(
            API.USER32.PeekMessageA,
            (msg: NativePointer, hWnd: NativePointer, msgFilterMin: number, msgFilterMax: number, removeMsg: number): number => {
                const success = PeekMessageA(msg, hWnd, msgFilterMin, msgFilterMax, removeMsg);

                if (success && this.gameWindow.isNull()) {
                    hWnd = msg.readPointer();

                    const MAX_CLASS_NAME = 1024;
                    const buf = Memory.alloc(MAX_CLASS_NAME);

                    if (API.USER32.GetClassNameW(hWnd, buf, MAX_CLASS_NAME) == 0)
                        return success;

                    if (buf.readUtf16String() != 'Diablo II')
                        return success;

                    this.gameWindow = hWnd;

                    const wndclassA = Memory.alloc(0x28);
                    API.USER32.GetClassInfoA(Modules.Game.base, utils.UTF8('Diablo II'), wndclassA);
                    const wndproc = wndclassA.add(4).readPointer();

                    if (wndproc.isNull()) {
                        utils.log('wndproc is null, wtf?');
                    } else {
                        this.gameWindowProc = new NativeFunction(wndproc, 'pointer', ['pointer', 'uint32', 'pointer', 'pointer'], 'stdcall')
                    }
                }

                if (success) {
                    // if ((d2wnd && !d2wnd.equals(hWnd)) || hWnd.isNull())
                    //     return success;

                    // do {
                    //     if (d2wnd === undefined)
                    //         break;

                    //     if (!d2wnd.equals(hWnd))
                    //         break;

                    //     this.messageLoop(msg);

                    // } while (0);

                } else if (Process.getCurrentThreadId() == this.mainThreadId) {
                    this.idleLoop();
                }

                return success;
            },
            'int32', ['pointer', 'pointer', 'uint32', 'uint32', 'uint32'], 'stdcall',
        );

        const OnKeyDown = Interceptor2.jmp(
            this.addrs.D2Client.OnKeyDown,
            (msg: NativePointer) => {
                OnKeyDown(msg);
                this.messageLoop(msg);
            },
            'void', ['pointer'], 'stdcall',
        );

        const HandleCommand = Interceptor2.jmp(
            this.addrs.D2Client.HandleCommand,
            (cmdW: NativePointer, cmdA: NativePointer, arg3: number): number => {
                this.handleCommand(cmdW.readUtf16String()!);
                return HandleCommand(cmdW, cmdA, arg3);
            },
            'uint32', ['pointer', 'pointer', 'uint32'], 'thiscall',
        );

        Memory.patchCode(this.addrs.D2Client.HandleKeyDownAfterInput1, 1, code => code.writeU8(0));
        Memory.patchCode(this.addrs.D2Client.HandleKeyDownAfterInput2, 1, code => code.writeU8(0));

        Memory.patchCode(this.addrs.D2Client.CreateMainScreenButtons, 7, code => {
            code.writeByteArray([0xB9, 0x13, 0x00, 0x00, 0x00, 0x8B, 0xF0]);
        });
    }

    get MousePos() {
        return {
            X: this.addrs.D2Client.MouseX.readU32(),
            Y: this.addrs.D2Client.MouseY.readU32(),
        };
    }

    get GameInfo(): d2types.GameInfo | null {
        const p = this.addrs.D2Client.GameInfo.readPointer();
        return p.isNull() ? null : new d2types.GameInfo(p);
    }

    get ClientState(): number {
        return this.addrs.D2Client.ClientState.readU32();
    }

    get View(): d2types.View {
        return new d2types.View(this.addrs.D2Client.View.readPointer());
    }

    LeaveGame() {
        if (this.gameWindow.isNull())
            return;

        const p = Memory.alloc(Process.pointerSize);
        p.writePointer(this.gameWindow);
        this.addrs.D2Client.LeaveGame(0, p);
    }

    GetLevelNameFromLevelNo(levelNo: number): string {
        const s = this.addrs.D2Client.GetLevelNameFromLevelNo(levelNo);
        return s.isNull() ? '<None>' : s.readUtf16String()!;
    }

    FindClientSideUnit(unitId: number, unitType: D2UnitType): d2types.Unit {
        return new d2types.Unit(this.addrs.D2Client.FindClientSideUnit(unitId, unitType));
    }

    FindServerSideUnit(unitId: number, unitType: D2UnitType): d2types.Unit {
        return new d2types.Unit(this.addrs.D2Client.FindServerSideUnit(unitId, unitType));
    }

    callIsUnitVisibleCaller?: NativeFunction<number, [NativePointer, NativePointer]>;

    IsUnitVisible(unit: NativePointer): boolean {
        if (!this.callIsUnitVisibleCaller) {
            const gum = Memory.alloc(Process.pageSize);
            Memory.patchCode(gum, 0x100, code => {
                const w = new X86Writer(code, {pc: gum});
                w.putPushReg('esi');
                w.putMovRegReg('esi', 'ecx');
                w.putCallReg('edx');
                w.putPopReg('esi');
                w.putRet();
                w.flush();
            });

            this.callIsUnitVisibleCaller = new NativeFunction(gum, 'uint32', ['pointer', 'pointer'], 'fastcall');
            (this.callIsUnitVisibleCaller as any).gum = gum;
            utils.log(this.callIsUnitVisibleCaller);
        }

        return this.callIsUnitVisibleCaller(unit, this.addrs.D2Client.IsUnitVisible) != 0;
    }

    GetPlayerUnit(): d2types.Unit {
        return new d2types.Unit(this.addrs.D2Client.GetPlayerUnit());
    }

    GetUnitName(unit: NativePointer): string {
        const name = this.addrs.D2Client.GetUnitName(unit);
        if (name.isNull())
            return '';

        return name.readUtf16String()!;
    }

    GetUIVars(v: D2UIVars): number {
        return this.addrs.D2Client.GetUIVars(v);
    }

    SetUIVars(v: D2UIVars, type: number, arg3: number): number {
        return this.addrs.D2Client.SetUIVars(v, type, arg3);
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

    // helper

    onMapReveal() {
        this.levelNo = D2Game.D2Common.getCurrentLevelNo();
    }

    onSetSkill(skill: D2GSPacket.SetSkill) {
        if (skill.leftHand) {
            this.leftSkill = skill.skillId;
        } else {
            this.rightSkill = skill.skillId;
        }
    }

    onSetState(state: D2GSPacket.SetState) {
        const player = this.GetPlayerUnit();
        if (player.isNull() || state.unitGUID != this.GetPlayerUnit().ID)
            return;

        switch (state.state) {
            case D2StateID.SkillCooldown:
            case D2StateID.Hurricane:
                utils.log(`set state: ${state.state.hex()}`);
                this.addState(state.state);
                break;
        }
    }

    onEndState(state: D2GSPacket.EndState) {
        if (this.removeState(state.state)) {
            utils.log(`remove state: ${state.state.hex()}`);
        }
    }

    onWalkVerify(walk: D2GSPacket.WalkVerify) {
        // utils.log(`walk verify: ${walk.x}, ${walk.y}`);
        this.playerLocation = new d2types.Coord(walk.x, walk.y);
    }

    onReassignPlayer(player: D2GSPacket.ReassignPlayer) {
        // utils.log(`reassign player: ${player.x}, ${player.y}`);
        this.playerLocation = new d2types.Coord(player.x, player.y);
    }

    showKeyAction(name: string, state: boolean) {
        this.PrintPartyString(`${name} Toggle -> ${state ? 'OFF' : 'ON'}`, D2StringColor.Orange);
        this.PrintPartyString('Key Action:', D2StringColor.Purple)
    }

    scheduleOnMainThread(fn: () => void) {
        if (Process.getCurrentThreadId() == this.mainThreadId) {
            fn();
        } else {
            this.mainThreadCallbacks.push(fn);
        }
    }

    scheduleOnMainThreadAsync<T>(fn: () => T, controller?: AbortController): Promise<T> {
        if (controller) {
            return new Task(resolve => {
                this.scheduleOnMainThread(function() {
                    resolve(fn());
                });
            }, controller);

        } else {
            return new Promise(resolve => {
                this.scheduleOnMainThread(function() {
                    resolve(fn());
                });
            });
        }
    }

    onIdleLoop(fn: () => void) {
        this.idleLoopCallbacks.push(fn);
    }

    onKeyDown(fn: (vk: number) => void) {
        this.keyDownCallbacks.push(fn);
    }

    idleLoop() {
        this.idleLoopCallbacks.forEach(cb => cb());
        this.mainThreadCallbacks.splice(0).forEach(fn => fn());
    }

    messageLoop(msg: NativePointer) {
        const message = msg.add(4).readU32();

        // utils.log(`msg: ${message.hex()}`);

        switch (message) {
            case 0x100:    // WM_KEYDOWN
            {
                const vk = msg.add(8).readU32();
                const previousKeyState = msg.add(0xC).readU32() & 0x40000000;

                if (previousKeyState == 0) {
                    this.keyDownCallbacks.forEach(cb => cb(vk));
                }

                break;
            }
        }
    }

    registerCommand(cmd: string, handler: ICommandHandler) {
        this.commandHandler[cmd] = handler;
    }

    handleCommand(cmdline: string) {
        this.handleCommandAsync(cmdline).catch(() => {});
    }

    async handleCommandAsync(cmdline: string) {
        if (cmdline[0] != '.')
            return false;

        const args = cmdline.slice(1).split(' ').filter(s => s.length);
        const handler = this.commandHandler[args[0]]

        utils.log(`argv: ${args}`);
        if (!handler)
            return false;

        return handler.handleCommand(args);
    }

    hasState(state: number): boolean {
        return this.activeStates.has(state);
    }

    addState(state: number) {
        this.activeStates.add(state);
    }

    removeState(state: number): boolean {
        return this.activeStates.delete(state);
    }

    runToLocation(x: number, y: number) {
        const SIZE = 5;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.RUNTOLOCATION)
        payload.add(0x01).writeU16(x)
        payload.add(0x03).writeU16(y);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));

        const path = this.GetPlayerUnit().Path;
        path.X = x;
        path.Y = y;
    }

    updatePlayerPos(x: number, y: number) {
        const SIZE = 5;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.UPDATEPLAYERPOS)
        payload.add(0x01).writeU16(x)
        payload.add(0x03).writeU16(y);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    leftSkillOnLocation(x: number, y: number) {
        const SIZE = 5;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.LEFTSKILLONLOCATION);
        payload.add(0x01).writeU16(x);
        payload.add(0x03).writeU16(y);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    leftSkillOnLocationEx(x: number, y: number) {
        const SIZE = 5;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.LEFTSKILLONLOCATIONEX);
        payload.add(0x01).writeU16(x);
        payload.add(0x03).writeU16(y);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    rightSkillOnLocation(x: number, y: number) {
        const SIZE = 5;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.RIGHTSKILLONLOCATION);
        payload.add(0x01).writeU16(x);
        payload.add(0x03).writeU16(y);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    rightSkillOnLocationEx(x: number, y: number) {
        const SIZE = 5;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.RIGHTSKILLONLOCATIONEX);
        payload.add(0x01).writeU16(x);
        payload.add(0x03).writeU16(y);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    selectSkill(lefthand: boolean, skillId: number) {
        const SIZE = 9;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.SELECTSKILL);
        payload.add(0x01).writeU16(skillId);
        payload.add(0x03).writeU8(0);
        payload.add(0x04).writeU8(lefthand ? 0x80 : 0x00);
        payload.add(0x05).writeU32(0xFFFFFFFF);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    OnRightClickGum = NULL;

    castSkill(skillId: number, lefthand = false, coord?: d2types.Coord) {
        if (!coord)
            coord = this.getPlayerCoord();

        this.selectSkill(lefthand, skillId);
        if (lefthand) {
            this.leftSkillOnLocation(coord.x, coord.y);
        } else {
            switch (skillId) {
                case D2SkillID.Sor_Teleport:
                case D2SkillID.Dru_Teleport:
                    break;

                default:
                    this.rightSkillOnLocation(coord.x, coord.y);
                    return;
            }

            // if (this.OnRightClickGum.isNull()) {
            //     const SIZE = 0x1000;
            //     this.OnRightClickGum = Memory.alloc(SIZE);
            //     Memory.patchCode(this.OnRightClickGum, SIZE, code => {
            //         const w = new X86Writer(code, {pc: this.OnRightClickGum});
            //         w.putPushReg('esi');
            //         w.putMovRegReg('esi', 'ecx');
            //         w.putCallAddress(ptr(0x462BA0));
            //         w.putPopReg('esi');
            //         w.putRet();
            //     });

            //     utils.log(`this.OnRightClickGum: ${this.OnRightClickGum}`);
            // }

            // const param = Memory.alloc(0x20);
            // param.writeU32(0x46);
            // param.add(0x04).writePointer(this.GetPlayerUnit());
            // param.add(0x0C).writeU32(pos.x);
            // param.add(0x10).writeU32(pos.y);

            // new NativeFunction(this.OnRightClickGum, 'void', ['pointer'], 'fastcall')(param);
            // ptr(0x7A0654).writeU32(1);

            // new NativeFunction(ptr(0x481030), 'void', ['uint8', 'pointer', 'uint32', 'uint32', 'uint32'], 'fastcall')(D2ClientCmd.RIGHTSKILLONLOCATION, this.GetPlayerUnit(), pos.x, pos.y, 0);

            if (1) {
                const param = Memory.alloc(0x20);
                param.writeU32(skillId);
                param.add(0x04).writeU32(0xFFFFFFFF);
                param.add(0x08).writeU32(coord.x);
                param.add(0x0C).writeU32(coord.y);
                new NativeFunction(ptr(0x480C10), 'uint32', ['uint32', 'pointer', 'pointer', 'uint32'], 'fastcall')(0x15, this.GetPlayerUnit(), param, 0);
                // utils.log(`D2Client_PlaySkillAnimation: ${ret}`);
            }

            this.rightSkillOnLocation(coord.x, coord.y);
        }
    }

    interactWithEntity(unitType: number, unitId: number) {
        const SIZE = 9;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.INTERACTWITHENTITY);
        payload.add(1).writeU32(unitType);
        payload.add(5).writeU32(unitId);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    npcInit(unitType: number, unitId: number) {
        const SIZE = 9;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.NPC_INIT)
        payload.add(1).writeU32(unitType)
        payload.add(5).writeU32(unitId);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    entityAction(unitType: number, unitId: number, complement = 0) {
        const SIZE = 0xD;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.ENTITYACTION)
        payload.add(1).writeU32(unitType)
        payload.add(5).writeU32(unitId)
        payload.add(9).writeU32(complement);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    repair(npcUnitId: number, itemUnitId = 0) {
        const SIZE = 0x11;
        const payload = Memory.alloc(SIZE);
        const repairOne = itemUnitId == 0 ? 0 : 1;

        payload.writeU8(D2ClientCmd.REPAIR)
        payload.add(0x01).writeU32(npcUnitId)
        payload.add(0x05).writeU32(itemUnitId)
        payload.add(0x09).writeU32(repairOne)
        payload.add(0x0D).writeU32(0x80000000);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    npcSell(npcUnitId: number, itemUnitId: number, cost: number) {
        const SIZE = 0x11;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.NPC_SELL)
        payload.add(0x01).writeU32(npcUnitId)
        payload.add(0x05).writeU32(itemUnitId)
        payload.add(0x09).writeU32(0)
        payload.add(0x0D).writeU32(cost);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    npcIdentifyItems(npcUnitId: number) {
        const SIZE = 5;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.NPC_IDENTIFYITEMS)
        payload.add(0x01).writeU32(npcUnitId);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    npcCancel(unitType: number, unitId: number) {
        const SIZE = 9;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.NPC_CANCEL);
        payload.add(1).writeU32(unitType);
        payload.add(5).writeU32(unitId);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    useItem(unitId: number) {
        const SIZE = 0xD;
        const payload = Memory.alloc(SIZE);

        const coord = this.getPlayerCoord();

        payload.writeU8(D2ClientCmd.USEITEM)
        payload.add(1).writeU32(unitId)
        payload.add(5).writeU32(coord.x)
        payload.add(9).writeU32(coord.y);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    pickupBufferItem(unitId: number) {
        const SIZE = 5;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.PICKUPBUFFERITEM)
        payload.add(1).writeU32(unitId);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    itemToBuffer(unitId: number, x: number, y: number, page: D2ItemInvPage) {
        const SIZE = 0x11;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.ITEMTOBUFFER)
        payload.add(0x1).writeU32(unitId);
        payload.add(0x5).writeU32(x);
        payload.add(0x9).writeU32(y);
        payload.add(0xD).writeU32(page);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    dropItem(unitId: number) {
        const SIZE = 5;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.DROPITEM)
        payload.add(1).writeU32(unitId);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    addStat(id: number) {
        const SIZE = 3;
        const payload = Memory.alloc(SIZE);

        payload.writeU8(D2ClientCmd.ADDSTAT)
        payload.add(1).writeU16(id);

        D2Game.D2Net.SendPacket(utils.ptrToBytes(payload, SIZE));
    }

    joinGame() {
        // this.mainThreadCallbacks = [];
        this.gameLoaded = true;
        this.gameJoinTime = utils.getCurrentTimestamp();
    }

    exitGame() {
        this.gameLoaded             = false;
        this.gameJoinTime           = 0;
        this.leftSkill              = 0;
        this.rightSkill             = 0;
        this.levelNo                 = 0;
        this.playerLocation         = d2types.Coord.default();
        this.activeStates.clear();
        // this.mainThreadCallbacks    = [];
    }

    getPlayerCoord() {
        return D2Game.D2Common.Unit.getUnitCoord(this.GetPlayerUnit());
    }

    getDistanceBetweenPoints(pos1: d2types.Coord, pos2: d2types.Coord) {
        return Math.abs(Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2)))
    }
}