import * as d2types from '../d2types';
import * as utils from '../../utils';
import { API } from '../../modules';
import { D2Game } from '../game';
import { AbortController, Task } from '../../task';
import {
    D2LevelNo,
    D2SkillID,
    D2StatID,
    D2UnitType,
    D2ItemType,
    D2UnitItemMode,
    D2ClientState,
    D2ItemInvPage,
    D2CollisionFlags,
    D2UIVars,
    D2ItemQuality,
    D2ItemCode,
} from '../types';

enum Interval {
    Immediately = 0,
    Millisecond = 1,
    Second      = 1000,
    Minute      = Second * 60,
    Default     = 500,
    Fast        = 200,
    _1ms        = Millisecond,
    _50ms       = Millisecond * 50,
    _100ms      = Millisecond * 100,
    _200ms      = Millisecond * 200,
    _300ms      = Millisecond * 300,
    _500ms      = Millisecond * 500,
    _800ms      = Millisecond * 800,

    LeaveGameTimeout    = Second * 2,
    CreateGameTimeout   = Second * 5,
    KCTimeout           = Minute * 3,
    BacktrackTimeout    = Second * 5,
    HurricaneTimeout    = Second * 20,
    ThunderStormTimeout = Second * 240,
}

enum MonsterID {
    Cow1Min         = 864,      // ms864
    Cow1Max         = 873,      // ms873

    Cow2Min         = 874,      // ms874
    Cow2Max         = 884,      // ms883

    TheIceCaveMin   = 932,      // ms932
    TheIceCaveMax   = 940,      // ms940

    ThePowCityMin   = 941,      // ms941
    ThePowCityMax   = 950,      // ms941
}

enum NpcID {
    Charsi          = 154,
    DeckardCain1    = 265,
    DeckardCain5    = 520,
    Larzuk          = 511,
}

class TargetInfo {
    name        : string;
    ID          : number;
    Type        : number;
    TxtFileNo   : number;
    Mode        : number;
    distance    : number;
    pos         : d2types.Coord;
    ptr         : d2types.Unit;

    constructor(unit: d2types.Unit) {
        this.TxtFileNo  = unit.TxtFileNo;
        this.Type       = unit.Type;
        this.ID         = unit.ID;
        this.Mode       = unit.Mode;
        this.name       = D2Game.D2Client.GetUnitName(unit);
        this.pos        = D2Game.D2Common.Unit.getUnitCoord(unit);
        this.distance   = 10000;
        this.ptr        = unit;
    }

    get isMonster() {
        return this.Type == D2UnitType.Monster;
    }

    getCoord(): d2types.Coord {
        if (this.Type == D2UnitType.Item || this.ptr.isNull())
            return this.pos;

        if (this.ptr.Type == D2UnitType.Released)
            return this.pos;

        return D2Game.D2Common.Unit.getUnitCoord(this.ptr);
    }
}

class TargetArray extends Array<TargetInfo> {
    ptrset: {[key: string] : boolean} = {};

    pop(): TargetInfo | undefined {
        const r = super.pop();
        if (r) {
            delete this.ptrset[r.ptr.toString()];
        }
        return r;
    }

    push(t: TargetInfo) {
        this.ptrset[t.ptr.toString()] = true;
        return super.push(t);
    }

    insert(at: number, ...items: TargetInfo[]) {
        this.splice(at, 0, ...items);
    }

    includes(searchElement: TargetInfo): boolean {
        return this.ptrset[searchElement.ptr.toString()];
    }

    extend(arr: TargetArray): this {
        for (const e of arr) {
            if (!this.includes(e))
                this.push(e);
        }

        return this;
    }
}

export class BotAutoKC {
    readonly D2Duck         = D2Game.getInstance().getD2Duck()!;
    readonly RangeTPMax     = 40;
    readonly RangeMax       = 200;
    readonly RangeMin       = 20;
    readonly RangeStep      = 20;
    readonly Cow2Only       = true;

    private controller              = new AbortController;
    private disabled                = true;
    private range                   = this.RangeMax;
    private kcStartTime             = 0;
    private hurricaneStartTime      = 0;
    private thunderStormStartTime   = 0;
    private backtrackFailCount      = 0;
    private backtrackEmptyTime      = 0;
    private backtrack               = new Array<d2types.Coord>;

    install() {
        this.run();
    }

    reset() {
        this.backtrack.splice(0);

        this.kcStartTime            = 0;
        this.hurricaneStartTime     = 0;
        this.thunderStormStartTime  = 0;
        this.backtrackFailCount     = 0;
        this.backtrackEmptyTime     = 0;
    }

    isThunderStormTimeout() {
        return utils.getCurrentTimestamp() - this.thunderStormStartTime > Interval.ThunderStormTimeout;
    }

    isHurricaneTimeout() {
        return utils.getCurrentTimestamp() - this.hurricaneStartTime > Interval.HurricaneTimeout;
    }

    isBacktrackTimeout() {
        return this.backtrackEmptyTime != 0 && utils.getCurrentTimestamp() - this.backtrackEmptyTime > Interval.BacktrackTimeout;
    }

    isKCTimeout() {
        return this.kcStartTime != 0 && utils.getCurrentTimestamp() - this.kcStartTime > Interval.KCTimeout;
    }

    initKcStartTime(force = false) {
        if (force || this.kcStartTime == 0) {
            this.kcStartTime = utils.getCurrentTimestamp();
            utils.log(`kc start time: ${this.kcStartTime}`);
        }
    }

    setKcTimeout() {
        this.kcStartTime = Interval._1ms;
    }

    async runOnMainThread<T>(fn: () => T): Promise<T> {
        // utils.log('runOnMainThread enter');
        const ret = D2Game.D2Client.scheduleOnMainThreadAsync(fn, this.controller);
        // utils.log(`runOnMainThread leave: ${new Error().stack}`);
        return ret;
    }

    getUnitDistanceSync(player: d2types.Unit, target: d2types.Unit) {
        const [pos1, pos2] = [
            D2Game.D2Common.Unit.getUnitCoord(player),
            D2Game.D2Common.Unit.getUnitCoord(target),
        ];

        return this.getUnitDistanceBetweenCoords(pos1, pos2);
    }

    async getUnitDistance(player: d2types.Unit, target: d2types.Unit) {
        return this.runOnMainThread(() => {
            return this.getUnitDistanceSync(player, target);
        });
    }

    async getUnitCoord(unit: d2types.Unit) {
        return await this.runOnMainThread(() => D2Game.D2Common.Unit.getUnitCoord(unit));
    }

    getUnitDistanceBetweenCoords(pos1: d2types.Coord, pos2: d2types.Coord) {
        return D2Game.D2Common.Unit.getUnitDistanceBetweenCoords(pos1, pos2)
        return Math.abs(Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2)))
    }

    getCoordByDistance(pos1: d2types.Coord, pos2: d2types.Coord, distance: number): d2types.Coord {
        return D2Game.D2Common.Unit.getCoordByDistance(pos1, pos2, distance);
    }

    async getCurrentLevelNo() {
        return this.runOnMainThread(() => this.getCurrentLevelNoSync());
    }

    getCurrentLevelNoSync() {
        return D2Game.D2Common.getCurrentLevelNo();
    }

    async getPlayerCoord() {
        return this.runOnMainThread(function() {
            return D2Game.D2Client.getPlayerCoord();
        })
    }

    async findNearestUnit(sourceUnit: d2types.Unit, range: number, cb: (unit: d2types.Unit, source: d2types.Unit, room1: d2types.Room1) => boolean): Promise<d2types.Unit | null> {
        return this.runOnMainThread(function() {
            return D2Game.D2Common.Unit.findNearbyUnits(sourceUnit, range, cb);
        });
    }

    async castSkill(skillId: number, lefthand = false, pos?: d2types.Coord) {
        // switch (skillId) {
        //     case D2SkillID.Sor_Teleport:
        //     case D2SkillID.Dru_Teleport:
        //     {
        //         const param = Memory.alloc(8);
        //         param.writeU32(skillId);
        //         param.add(0x04).writeU32(0xFFFFFFFF);

        //         await this.runOnMainThread(() => {
        //             new NativeFunction(ptr(0x480C10), 'uint32', ['uint32', 'pointer', 'pointer', 'uint32'], 'fastcall')(0x15, D2Game.D2Client.GetPlayerUnit(), param, 0);
        //             ptr(0x7A0654).writeU32(1);
        //             D2Game.D2Client.castSkill(skillId, lefthand, pos);
        //         });
        //         return;
        //     }
        // }

        return this.runOnMainThread(function() {
            D2Game.D2Client.castSkill(skillId, lefthand, pos);
        });
    }

    async interactWithEntity(unitType: number, unitId: number) {
        return this.runOnMainThread(function() {
            D2Game.D2Client.interactWithEntity(unitType, unitId);
        });
    }

    async applyBuff(skillId: number) {
        return this.runOnMainThread(function() {
            D2Game.D2Client.castSkill(skillId, skillId == D2SkillID.Dru_Hurricane, D2Game.D2Client.getPlayerCoord());
        });
    }

    async delay(ms: number) {
        await utils.delay(ms, this.controller);
        return;
    }

    run() {
        const VK_OEM_7 = API.VirtualKeyCode.VK_OEM_7;
        const createTask = () => {
            return new Task(async (resolve, reject, onAbort) => {
                onAbort(() => {
                    this.reset();
                });

                for (;;) {
                    try {
                        if (this.disabled) {
                            this.reset();
                            // resolve();
                            // return;

                        } else {
                            await this.run2();
                        }

                    } catch (error) {
                        utils.log(`kc bot: ${error}`);
                        // reject(error);
                        // return;
                    }

                    await utils.delay(Interval._50ms);
                }
            }, this.controller);
        };

        const task = createTask();

        D2Game.D2Client.onKeyDown((vk: number) => {
            switch (vk) {
                case VK_OEM_7:
                    this.disabled = !this.disabled;
                    if (this.disabled) {
                        task.abort('stop kc');
                        // task = null;
                    } else {
                        // task = createTask();
                    }

                    D2Game.D2Client.showKeyAction('Auto KC', this.disabled);
                    break;
            }
        });
    }

    async run2() {
        if (this.disabled) {
            this.reset();
            return;
        }

        const now = utils.getCurrentTimestamp();
        utils.log(`kc time: ${Math.floor((now - this.kcStartTime) / Interval.Minute).pad(2)}:${Math.floor((now - this.kcStartTime) % Interval.Minute / Interval.Second).pad(2)}`);

        if (D2Game.D2Client.ClientState != D2ClientState.InGame)
            await this.nextGame();

        if (this.isKCTimeout()) {
            this.reset();
            await this.nextGame();
            return;
        }

        await this.handleLevelNo()
    }

    async handleLevelNo() {
        const levelNo = await this.getCurrentLevelNo();

        utils.log(`levelNo: ${D2LevelNo[levelNo] ? D2LevelNo[levelNo] : levelNo}`);

        switch (levelNo) {
            case D2LevelNo.RogueEncampment:
                await this.onRogueEncampment();
                break;

            case D2LevelNo.Harrogath:
                await this.onHarrogath();
                break;

            case D2LevelNo.MooMooFarm1:
            case D2LevelNo.MooMooFarm2:
                await this.onCow(levelNo);
                break;

            case D2LevelNo.TheIceCave:
            case D2LevelNo.ThePowCity:
                await this.onFarming(levelNo);
                break;

            default:
                this.reset();
                break;
        }
    }

    async checkPlayerState() {
        if (this.kcStartTime != 0) {
            this.disabled = true;
            return false;
        }

        await this.dropCursorItem();

        if (!await this.checkMana(0.75, 500))
            return false;

        if (!await this.cubeHasEnoughSlots(0.25)) {
            await this.identifyAndDropItems();
            return false;
        }

        await this.repair();

        return true;
    }

    async onRogueEncampment() {
        if (!await this.checkPlayerState())
            return;

        let portal = await this.findCow1Portal();
        if (portal == null) {
            await this.castSkill(D2SkillID.CreateCowPortal, false);
            await this.delay(Interval.Second);

            portal = await this.findCow1Portal();
            if (!portal) {
                throw new Error('cant open cow1 portal');
            }
        }

        utils.log('apply buffs');

        for (const buf of [D2SkillID.Dru_Boost, D2SkillID.Dru_Werewolf, D2SkillID.MagicShield]) {
            await this.applyBuff(buf);
            await this.delay(Interval.Second);
        }

        await this.interactWithEntity(portal!.Type, portal!.ID);
        await this.delay(Interval.Default);

        if (!this.Cow2Only && await this.getCurrentLevelNo() == D2LevelNo.MooMooFarm1) {
            const tile = await this.findCow2Tile();
            if (tile) {
                this.backtrack.push(await this.getUnitCoord(tile!));
            }
        }
    }

    async onHarrogath() {
        const wppos = new d2types.Coord(5104, 5069);
        const playerpos = await this.getPlayerCoord();

        if (this.getUnitDistanceBetweenCoords(wppos, playerpos) > 30) {
            await this.castSkill(D2SkillID.Sor_Teleport, false, wppos);
            await this.delay(Interval.Default);
        }

        if (!await this.checkPlayerState())
            return;

        let portal = await this.findThePowCityPortal();
        if (portal == null) {
            await this.findAndUsePortalScroll(D2ItemCode.TheIceCaveScroll);
            await this.delay(Interval.Second);

            portal = await this.findThePowCityPortal();
            if (!portal) {
                throw new Error('cant open the pow city portal');
            }
        }

        utils.log('apply buffs');

        for (const buf of [D2SkillID.Dru_Boost, D2SkillID.Dru_Werewolf, D2SkillID.MagicShield]) {
            await this.applyBuff(buf);
            await this.delay(Interval.Second);
        }

        await this.interactWithEntity(portal!.Type, portal!.ID);
        await this.delay(Interval.Default);
    }

    async onCow(levelNo: number) {
        await this.applyBattleBuffs();

        if (this.Cow2Only && levelNo == D2LevelNo.MooMooFarm1) {
            if (await this.gotoCow2())
                return;
        }

        await this.onFarming(levelNo);
    }

    async onFarming(levelNo: number) {
        await this.applyBattleBuffs();

        this.initKcStartTime();

        const targets = await this.findTargets();
        if (!targets) {
            if (await this.doBacktrack())
                return;

            await this.delay(Interval.Default);

            if (!this.isBacktrackTimeout())
                return;

            if (levelNo == D2LevelNo.MooMooFarm1) {
                if (await this.gotoCow2())
                    return;
            }

            await this.nextGame();

            return;
        }

        for (let target = targets.pop(); target !== undefined; target = targets.pop()) {
            if (!await this.checkAvailableCubeSlots(true))
                break;

            if (this.isKCTimeout())
                break;

            switch (await this.getCurrentLevelNo()) {
                default:
                    return;

                case D2LevelNo.MooMooFarm1:
                case D2LevelNo.MooMooFarm2:
                case D2LevelNo.TheIceCave:
                case D2LevelNo.ThePowCity:
                    break;
            }

            await this.applyBattleBuffs();
            const nextTarget = await this.handleTarget(target);
            if (nextTarget) {
                targets.push(nextTarget);
            }

            const newTargets = await this.findTargets();
            if (!newTargets)
                continue;

            targets.extend(newTargets);
            targets.sort((a, b) => b.distance - a.distance);

            // if (1) break;
        }
    }

    async checkAvailableCubeSlots(nextGame = false) {
        if (!await this.cubeHasEnoughSlots(0.05)) {
            utils.log('cube has no enough slots, stop');

            if (nextGame)
                await this.nextGame();

            return false;
        }

        return true;
    }

    async cubeHasEnoughSlots(freeThreshold: number) {
        const [freeCount, totalCount] = await this.runOnMainThread(() => {
            const player = D2Game.D2Client.GetPlayerUnit();
            const inv = player.Inventory;
            const grid = inv.GetInventoryGrid(D2ItemInvPage.Cube);
            const items = grid.Items;

            return [
                items.filter(x => x.isNull()).length,
                items.length,
            ];
        });

        if (totalCount == 0)
            return true;

        utils.log(`freeCount: ${freeCount} / ${totalCount - freeCount} / ${totalCount} ${freeCount / totalCount * 100}%`);

        return freeCount / totalCount >= freeThreshold;

        // this.disabled = true;
        // throw new Error;

        // const cube = await this.runOnMainThread(() => D2Game.D2Common.findCube());
        // if (!cube)
        //     return false;

        // return !!(await this.runOnMainThread(() => D2Game.D2Common.Inventory.findSlotsForItem(cube!, D2ItemInvPage.Cube)));
    }

    async identifyAndDropItems() {
        utils.log('identifyAndDropItems');

        const cain = await this.findNpc(await this.getDeckardCainId(), 50);
        if (!cain) {
            this.disabled = true;
            utils.log('cain not found');
            return;
        }

        const playerPos = await this.getPlayerCoord();
        let pos = await this.getUnitCoord(cain);
        let tooFar = false;
        if (this.getUnitDistanceBetweenCoords(playerPos, pos) > this.RangeTPMax) {
            pos = this.getCoordByDistance(playerPos, pos, this.RangeTPMax);
            tooFar = true;
        }

        await this.castSkill(D2SkillID.Sor_Teleport, false, pos);
        await this.delay(Interval.Default);

        if (tooFar)
            return;

        const D2Client = D2Game.D2Client;
        const actions = [
            () => {
                D2Client.interactWithEntity(cain.Type, cain.ID);
                D2Client.npcInit(cain.Type, cain.ID);
            },

            () => { D2Client.npcIdentifyItems(cain.ID); },
            () => { D2Client.npcCancel(cain.Type, cain.ID); },
        ]

        for (const action of actions) {
            await this.runOnMainThread(action);
            await this.delay(Interval.Default);
        }

        await this.runOnMainThread(() => {
            D2Game.D2Client.SetUIVars(D2UIVars.NpcMenu, 1, 0);
            const cube = D2Game.D2Common.findCube();
            D2Game.D2Client.useItem(cube!.ID)
        });

        await this.delay(Interval.Default);

        await D2Game.D2Client.handleCommandAsync('.drop bf');
        await D2Game.D2Client.handleCommandAsync('.invsort');

        API.USER32.SendMessageA(D2Game.D2Client.gameWindow, 0x0100, API.VirtualKeyCode.VK_OEM_6, 0);
        while (this.D2Duck.AutoTransmute.Toggle.readU32() != 0)
            await this.delay(100);

        await this.nextGame();
    }

    async getRepairNpcId() {
        switch (await this.getCurrentLevelNo()) {
            case D2LevelNo.RogueEncampment: return NpcID.Charsi;
            case D2LevelNo.Harrogath: return NpcID.Larzuk;
            default: return 0;
        }
    }

    async getDeckardCainId() {
        switch (await this.getCurrentLevelNo()) {
            case D2LevelNo.RogueEncampment: return NpcID.DeckardCain1;
            case D2LevelNo.Harrogath: return NpcID.DeckardCain5;
            default: return 0;
        }
    }

    async repair() {
        if (!await this.needRepair()) {
            utils.log('no repair needed');
            return;
        }

        const charsi = await this.findNpc(await this.getRepairNpcId());
        if (!charsi) {
            this.disabled = true;
            utils.log('charsi not found');
            return;
        }

        await this.castSkill(D2SkillID.Sor_Teleport, false, await this.getUnitCoord(charsi));
        await this.delay(Interval.Default);

        const D2Client = D2Game.D2Client;
        const actions = [
            () => {
                D2Client.interactWithEntity(charsi.Type, charsi.ID);
                D2Client.npcInit(charsi.Type, charsi.ID);
            },

            () => { D2Client.entityAction(charsi.Type, charsi.ID); },
            () => { D2Client.repair(charsi.ID); },
            () => { D2Client.npcCancel(charsi.Type, charsi.ID); },
        ]

        for (const action of actions) {
            await this.runOnMainThread(action);
            await this.delay(Interval.Default);
        }
    }

    async dropCursorItem() {
        await this.runOnMainThread(() => {
            const inv = D2Game.D2Client.GetPlayerUnit().Inventory;
            const item = D2Game.D2Common.Inventory.GetCursorItem(inv);

            if (item.isNull())
                return;

            D2Game.D2Client.dropItem(item.ID);
        })
    }

    async checkMana(expected: number, minmana: number) {
        const [mana, maxmana] = await this.runOnMainThread(function() {
            const player = D2Game.D2Client.GetPlayerUnit();
            const mana = D2Game.D2Common.Unit.GetUnitStat(player, D2StatID.Mana) >> 8;
            const maxmana = D2Game.D2Common.Unit.GetUnitStat(player, D2StatID.MaxMana) >> 8;

            return [mana, maxmana];
        });

        const percent = mana / maxmana;

        utils.log(`mana: ${mana} / ${maxmana} (${Math.floor(percent * 100)}%)`);

        return mana >= minmana || percent >= expected;
    }

    async needRepair() {
        return this.runOnMainThread(function() {
            let need = false;

            D2Game.D2Common.enumInventoryItems(function(item: d2types.Unit): boolean {
                if (D2Game.D2Common.Inventory.GetItemInvPage(item) != D2ItemInvPage.Equip)
                    return false;

                const maxDurability = D2Game.D2Common.Unit.GetUnitStat(item, D2StatID.MaxDurability);
                if (maxDurability == 0)
                    return false;

                const durability = D2Game.D2Common.Unit.GetUnitStat(item, D2StatID.Durability);

                if (durability / maxDurability > 0.5)
                    return false;

                need = true;
                return true;
            });

            return need;
        });
    }

    async findNpc(npcId: number, range = 50) {
        const player = D2Game.D2Client.GetPlayerUnit();

        return this.findNearestUnit(player, range, (unit: d2types.Unit): boolean => {
                if (unit.Type != D2UnitType.Monster || unit.TxtFileNo != npcId)
                    return false;

                return true;
            },
        );
    }

    async findCow1Portal() {
        return this.findTownPortal(60);
    }

    async findThePowCityPortal() {
        return this.findTownPortal(60);
    }

    async findTownPortal(txtFileNo: number) {
        return this.runOnMainThread(() => {
            return this.findNearestUnit(D2Game.D2Client.GetPlayerUnit(), 10, (target: d2types.Unit): boolean => {
                // Town portal
                return target.Type == D2UnitType.Object && target.TxtFileNo == txtFileNo;
            });
        });
    }

    async findAndUsePortalScroll(itemCode: string) {
        let item = await this.findPortalScroll(itemCode);
        if (!item) {
            const mbag = await this.findMagicBagByItemCode(itemCode);
            if (!mbag)
                return false;

            await this.runOnMainThread(() => D2Game.D2Client.useItem(mbag.ID));
            await this.delay(Interval.Default);

            item = await this.findPortalScroll(itemCode);
            if (!item)
                return false;
        }

        await this.runOnMainThread(() => D2Game.D2Client.useItem(item!.ID));
        return true;
    }

    async findPortalScroll(itemCode: string) {
        return this.runOnMainThread(() => {
            return D2Game.D2Common.enumInventoryItems(function(item: d2types.Unit) {
                const locatoin = D2Game.D2Common.Inventory.GetItemInvPage(item);
                if (locatoin != D2ItemInvPage.Inventory)
                    return false;

                if (D2Game.D2Common.Item.GetItemQuality(item) != D2ItemQuality.Normal)
                    return false;

                if (D2Game.D2Common.Item.GetItemCodeString(item) != itemCode)
                    return false;

                return true;
            });
        });
    }

    async findMagicBagByItemCode(itemCode: string) {
        const MagicBagSlotStatID = [601, 602, 603, 604, 605, 606, 607, 608];

        return this.runOnMainThread(() => {
            return D2Game.D2Common.enumInventoryItems(function(item: d2types.Unit) {
                const locatoin = D2Game.D2Common.Inventory.GetItemInvPage(item);
                if (locatoin != D2ItemInvPage.Inventory)
                    return false;

                if (D2Game.D2Common.Item.GetItemCodeString(item) != D2ItemCode.MagicBag)
                    return false;

                if (D2Game.D2Common.Item.GetItemQuality(item) != D2ItemQuality.Unique)
                    return false;

                const stats = D2Game.D2Common.Unit.GetUnitStatByFlags(item, 0x40);
                if (stats.isNull())
                    return false;

                const baseStat = stats.BaseStats;

                for (let index = 0; index != baseStat.Count; index++) {
                    const st = baseStat.at(index);

                    if (st.ID != MagicBagSlotStatID[index])
                        continue;

                    if (st.Value.hexToString() != itemCode)
                        continue;

                    utils.log(`bag<${item.ID}>: slot${index} code:'${st.Value.hexToString()}'`);

                    return true;
                }

                return false;
            });
        })
    }

    async findTargets() {
        const player = D2Game.D2Client.GetPlayerUnit();
        if (player.isNull()) {
            return null;
        }

        let farthestMonster : d2types.Unit | null = null;
        let nearestMonster  : d2types.Unit | null = null;
        // let nearestItem     : d2types.Unit | null = null;

        let nearestMonsterDistance  = this.RangeMax * 100;
        // let nearestItemDistance     = this.RangeMax * 100;

        const playerPos = await this.getUnitCoord(player);
        const targets = new TargetArray();

        await this.findNearestUnit(player, this.range, (target: d2types.Unit, source: d2types.Unit): boolean => {
            switch (target.Type) {
                case D2UnitType.Monster:
                {
                    const monsterId = target.TxtFileNo;

                    if (!this.checkMonsterId(monsterId)) {
                        // utils.log(`${target} invalid monsterid: ${monsterId} @ ${this.getCurrentLevelNoSync()}`);
                        break;
                    }

                    if (D2Game.D2Common.Unit.GetUnitStat(target, D2StatID.HP) == 0) {
                        break;
                    }

                    // if (D2Game.D2Common.Unit.GetUnitStat(target, D2StatID.ColdResist) > 700) {
                    //     break;
                    // }

                    if (!farthestMonster)
                        farthestMonster = target;

                    const d = this.getUnitDistanceSync(source, target);

                    if (!this.isTargetReachableSync(source, target))
                        break;

                    if (d < nearestMonsterDistance) {
                        nearestMonster = target;
                        nearestMonsterDistance = d;
                    }
                    break;
                }

                case D2UnitType.Item:
                {
                    if (D2Game.D2Common.Item.CheckItemType(target, D2ItemType.Gold)) {
                        break;
                    }

                    // if (this.D2Duck.Hackmap.GetUnitHiddenType(target) != 0) {
                    //     break;
                    // }

                    // if (!D2Game.D2Client.IsUnitVisible(target)) {
                    //     break;
                    // }

                    if (!target.isVisible()) {
                        break;
                    }

                    switch (this.D2Duck.AutoPick.GetPickupMethod(target)) {
                        case 0:
                            if (this.D2Duck.MagicBag.GetCertainBagWhichStoreItem(source.Inventory, D2Game.D2Common.Inventory.GetCursorItem(source.Inventory), target, NULL).isNull()) {
                                break;
                            }
                            // fallthrough

                        case 1:
                        case 2:
                        {
                            if (target.Mode != D2UnitItemMode.OnGround)
                                break;

                            const t = new TargetInfo(target);
                            t.distance = this.getUnitDistanceBetweenCoords(t.pos, playerPos);
                            targets.push(t);

                            // const d = this.getUnitDistanceSync(source, target);
                            // if (d < nearestItemDistance) {
                            //     nearestItem = target;
                            //     nearestItemDistance = d;
                            // }
                            // return true;
                        }
                    }

                    break;
                }
            }

            return false;
        });

        if (!nearestMonster && targets.length == 0) {
            utils.log('target not found');
            return null;
        }

        // from far to near
        targets.sort((a, b) => b.distance - a.distance);

        this.backtrackEmptyTime = 0;
        if (nearestMonster && nearestMonsterDistance > 5) {
            targets.insert(0, await this.runOnMainThread(() => new TargetInfo(nearestMonster!)));
        }

        return targets;
    }

    checkMonsterId(monsterId: number) {
        switch (this.getCurrentLevelNoSync()) {
            case D2LevelNo.MooMooFarm1:
                return monsterId >= MonsterID.Cow1Min && monsterId <= MonsterID.Cow1Max;

            case D2LevelNo.MooMooFarm2:
                return monsterId >= MonsterID.Cow2Min && monsterId <= MonsterID.Cow2Max;

            case D2LevelNo.TheIceCave:
                return monsterId >= MonsterID.TheIceCaveMin && monsterId <= MonsterID.TheIceCaveMax;

            case D2LevelNo.ThePowCity:
                return monsterId >= MonsterID.ThePowCityMin && monsterId <= MonsterID.ThePowCityMax;
        }

        return false;
    }

    async applyBattleBuffs(force = false) {
        if (!force && !this.isThunderStormTimeout() && !this.isHurricaneTimeout()) {
            return false;
        }

        utils.log('applyBattleBuffs');

        this.thunderStormStartTime = utils.getCurrentTimestamp();
        await this.applyBuff(D2SkillID.Sor_ThunderStorm);
        await this.delay(Interval._1ms * 300);

        for (let i = 0; i != 3; i++) {
            this.hurricaneStartTime = utils.getCurrentTimestamp();
            await this.applyBuff(D2SkillID.Dru_Hurricane);
            await this.delay(Interval.Fast);
        }

        return true;
    }

    async handleTarget(target: TargetInfo): Promise<TargetInfo | undefined> {
        const playerPos = await this.getPlayerCoord();
        const distance  = this.getUnitDistanceBetweenCoords(playerPos, target.pos);
        const name      = target.name;
        let targetPos   = await this.runOnMainThread(() => target.getCoord());

        switch (target.Type) {
            case D2UnitType.Monster:
            {
                const [hp, maxhp] = await this.runOnMainThread(() => [
                                        D2Game.D2Common.Unit.GetUnitStat(target.ptr, D2StatID.HP),
                                        D2Game.D2Common.Unit.GetUnitStat(target.ptr, D2StatID.MaxHP),
                                    ]);

                utils.log(`currentTarget<${name}><${target.ptr}>: ${hp} / ${maxhp} @ ${targetPos.x},${targetPos.y}`);

                if (hp == 0) {
                    return;
                }

                // if (distance < 10) {
                //     utils.log(`distance between player and monster: ${distance}`);
                //     return Interval.Immediately;
                // }

                if (distance > this.RangeMax) {
                    return;
                }

                break;
            }

            case D2UnitType.Item:
            {
                utils.log(`currentTarget<${name}><${target.ptr}> @ ${targetPos.x},${targetPos.y}`);
                break;
            }

            default:
                utils.log(`unknown item type: ${target.Type}`);
                return;
        }

        let dupCount = 0;

        for (let i = this.backtrack.length - 2; i >= 0; i--) {
            const p1 = this.backtrack[i];
            const p2 = this.backtrack[i + 1];

            if (!p1.equals(p2))
                break;

            dupCount++;
            utils.log(`equal<${dupCount}/${this.backtrack.length}>: ${p1} == ${p2}`);
        }

        const MaxDupCount = 20;
        let nextTarget = undefined;

        let t = target.Type == D2UnitType.Monster ? Interval._800ms: Interval._500ms;
        t = Interval._300ms;

        if (distance > this.RangeTPMax) {
            if (target.isMonster && !await this.isTargetReachable(D2Game.D2Client.GetPlayerUnit(), target.ptr)) {
                await this.delay(t);
                return nextTarget;
            }

            targetPos = this.getCoordByDistance(playerPos, targetPos, dupCount >= MaxDupCount ? 5 : this.RangeTPMax);
            nextTarget = target;
        }

        this.backtrack.push(playerPos);

        if (dupCount >= MaxDupCount) {
            this.setKcTimeout();

            // utils.log(`run from ${playerPos} to ${targetPos}, distance: ${this.getDistanceBetweenPoints(playerPos, targetPos)}`);

            // this.backtrack.splice(this.backtrack.length - dupCount - 1);

            // // await this.runOnMainThread(() => D2Game.D2Client.runToLocation(targetPos.x, targetPos.y));
            // await this.castSkill(D2SkillID.Sor_Teleport, false, targetPos);

            // t = Interval.Second;

        } else {
            utils.log(`TP from ${playerPos} to ${targetPos}, distance: ${this.getUnitDistanceBetweenCoords(playerPos, targetPos)}`);

            await this.castSkill(target.Type == D2UnitType.Item ? D2SkillID.Dru_Teleport : D2SkillID.Dru_Teleport, false, targetPos);
        }

        await this.delay(t);

        return nextTarget;
    }

    async doBacktrack() {
        if (this.backtrack.length == 0) {
            const now = utils.getCurrentTimestamp();

            if (this.backtrackEmptyTime == 0){
                this.backtrackEmptyTime = now;
            }

            return false;
        }

        const playerPos = await this.getPlayerCoord();
        const prevpos   = this.getLongestPath(playerPos);
        const distance  = this.getUnitDistanceBetweenCoords(playerPos, prevpos);

        let pos = prevpos;

        utils.log(`<${this.backtrack.length}> from ${playerPos} back to ${pos}, distance = ${Math.floor(distance)}`);

        if (distance == 0) {
            this.backtrackFailCount = 0;
            return true;
        }

        const MaxBacktrackFailCount = 10;

        if (distance > this.RangeTPMax) {
            pos = this.getCoordByDistance(playerPos, pos, this.backtrackFailCount >= MaxBacktrackFailCount ? 5 : this.RangeTPMax);
        }

        let t = Interval._200ms;

        if (this.backtrackFailCount >= MaxBacktrackFailCount) {
            this.backtrackFailCount = 0;
            await this.runOnMainThread(() => D2Game.D2Client.runToLocation(pos.x, pos.y));

            t = Interval.Second;

        } else {
            await this.castSkill(D2SkillID.Sor_Teleport, false, pos);
        }

        await this.delay(t);

        if (this.getUnitDistanceBetweenCoords(await this.getPlayerCoord(), pos) < 5) {
            this.backtrackFailCount = 0;
            return true;
        }

        this.backtrackFailCount++;
        this.backtrack.push(prevpos);

        return true;
    }

    async isTargetReachable(player: d2types.Unit, target: d2types.Unit) {
        return this.runOnMainThread(() => this.isTargetReachableSync(player, target));
    }

    isTargetReachableSync(player: d2types.Unit, target: d2types.Unit) {
        switch (this.getCurrentLevelNoSync()) {
            case D2LevelNo.MooMooFarm1:
            case D2LevelNo.MooMooFarm2:
                break;

            default:
                return true;
        }

        const playerPos = D2Game.D2Common.Unit.getUnitCoord(player);
        const d = this.getUnitDistanceSync(player, target);

        if (d <= this.RangeTPMax)
            return true;

        const targetPos = D2Game.D2Common.Unit.getUnitCoord(target);
        const pos1 = this.getCoordByDistance(playerPos, targetPos, this.RangeTPMax);
        const pos2 = this.getCoordByDistance(playerPos, targetPos, 3);
        const mask = D2CollisionFlags.Wall | D2CollisionFlags.BlockPlayer | D2CollisionFlags.Door;
        const room = D2Game.D2Common.Room.GetRoomFromUnit(player);

        // const mask1 = D2Game.D2Common.Collision.CheckMaskWithSizeXY(room, pos1.x, pos1.y, 1, 1, mask);
        // const mask2 = D2Game.D2Common.Collision.CheckMaskWithSizeXY(room, pos2.x, pos2.y, 1, 1, mask);
        // utils.log(`target: ${target}  mask1: ${mask1} mask2: ${mask2}`);

        if (D2Game.D2Common.Collision.CheckMaskWithSizeXY(room, pos1.x, pos1.y, 1, 1, mask) &&
            D2Game.D2Common.Collision.CheckMaskWithSizeXY(room, pos2.x, pos2.y, 1, 1, mask)) {
            // utils.log(`unreachable: ${target} @ ${targetPos}`);
            return false;
        }

        return true;
    }

    getLongestPath(playerPos: d2types.Coord): d2types.Coord {
        let pos = this.backtrack.pop()!;

        let distance = this.getUnitDistanceBetweenCoords(playerPos, pos);
        const slope = (playerPos.y - pos.y) / (playerPos.x - pos.x);
        const degree = slope * (180 / Math.PI);

        utils.log(`xy: ${playerPos.x},${playerPos.y}, xy2: ${pos.x},${pos.y}`);

        while (this.backtrack.length != 0) {
            const last = this.backtrack.pop()!;

            if (last.x == pos.x && last.y == pos.y)
                continue;

            const distance2 = this.getUnitDistanceBetweenCoords(playerPos, last);

            if (distance2 < distance) {
                continue;
            }

            if (distance2 >= 30) {
                this.backtrack.push(last);
                break;
            }

            const slope2 = (playerPos.y - last.y) / (playerPos.x - last.x);
            const degree2 = slope2 * (180 / Math.PI);

            utils.log(`degree: ${degree} : ${degree2}`)

            if (Math.abs(degree - degree2) > 20) {
                this.backtrack.push(last);
                break;
            }

            pos = last;
            distance = distance2;
        }

        return pos;
    }

    async gotoCow2() {
        const tile = await this.findCow2Tile();
        if (tile == null) {
            return false;
        }

        await this.castSkill(D2SkillID.Sor_Teleport, false, await this.getUnitCoord(tile));
        await this.delay(Interval.Default);

        await this.applyBattleBuffs(true);

        this.initKcStartTime(true);
        await this.interactWithEntity(tile.Type, tile.ID);
        await this.delay(Interval.Default);

        return true;
    }

    async findCow2Tile() {
        return this.runOnMainThread(() => D2Game.D2Common.findRoomTileByLevelNo(this.RangeTPMax, D2LevelNo.MooMooFarm2));
    }

    async nextGame() {
        utils.log(`nextGame`);

        global.gc && global.gc();
        this.reset();

        // if (D2Game.D2Client.ClientState != D2ClientState.InGame)
        //     return;

        await this.runOnMainThread(() => this.D2Duck.Hackmap.QuickNextGame(-1));

        while (D2Game.D2Client.ClientState == D2ClientState.InGame)
            await this.delay(Interval.Default);

        let createGameRetry = 0;

        for (;;) {
            await this.delay(Interval.Default);

            if (D2Game.D2Client.ClientState == D2ClientState.InGame)
                break;

            const ok = await this.runOnMainThread(() => {
                switch (D2Game.D2Client.ClientState) {
                    case D2ClientState.None:
                    case D2ClientState.GameList:
                    {
                        if (!D2Game.D2Multi.BNCreateGameTabOnClick())
                            return false;

                        D2Game.D2Multi.BNCreateGameBtnOnClick();
                        return true;
                    }
                }
            });

            if (!ok)
                continue;

            for (let d = 0; d < Interval.CreateGameTimeout; d += Interval.Default) {
                await this.delay(Interval.Default);
                if (D2Game.D2Client.gameLoaded) {
                    return;
                }
            }

            if (++createGameRetry == 200) {
                this.disabled = true;
                API.WIN32.RtlAdjustPrivilege(API.WIN32.SE_SHUTDOWN_PRIVILEGE, 1, 0, Memory.alloc(4));
                API.WIN32.SetSystemPowerState(1, 0);
                return;
            }
        }
    }
}
