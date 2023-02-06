import * as d2types from './d2types';
import { D2Game } from './game';
import { D2Base, ID2Addrs } from './d2base';
import { D2LevelNo, D2ItemQuality, D2UnitType, D2ItemLocation, D2ItemCode } from './types';

class D2Client_Level extends D2Base {
    #D2Common: D2Common;

    constructor(addrs: ID2Addrs, D2Common: D2Common) {
        super(addrs);
        this.#D2Common = D2Common;
    }

    get D2Common() {
        return this.#D2Common;
    }

    GetLevelsBin(levelNo: number): d2types.LevelsBin {
        return new d2types.LevelsBin(this.addrs.D2Common.Level.GetLevelsBin(levelNo));
    }
}

class D2Client_Room extends D2Base {
    #D2Common: D2Common;

    constructor(addrs: ID2Addrs, D2Common: D2Common) {
        super(addrs);
        this.#D2Common = D2Common;
    }

    get D2Common() {
        return this.#D2Common;
    }

    GetRoomFromUnit(unit: NativePointer): d2types.Room1 {
        return new d2types.Room1(this.addrs.D2Common.Room.GetRoomFromUnit(unit));
    }

    GetNearbyRooms(room1: NativePointer): d2types.Room1[] {
        const rooms = Memory.alloc(Process.pointerSize);
        const count = Memory.alloc(4);

        this.addrs.D2Common.Room.GetNearbyRooms(room1, rooms, count);

        const n = count.readU32();

        if (n == 0)
            return [];

        const p = rooms.readPointer();
        const roomsNear = [];

        for (let i = 0, n = count.readU32(); i != n; i++) {
            roomsNear.push(new d2types.Room1(p.add(i * Process.pointerSize).readPointer()));
        }

        return roomsNear;
    }

    GetLevelNoFromRoom(room: NativePointer): number {
        return this.addrs.D2Common.Room.GetLevelNoFromRoom(room)
    }
}

class D2Client_Unit extends D2Base {
    #D2Common: D2Common;

    constructor(addrs: ID2Addrs, D2Common: D2Common) {
        super(addrs);
        this.#D2Common = D2Common;
    }

    get D2Common() {
        return this.#D2Common;
    }

    GetUnitPosition(unit: NativePointer, pos: NativePointer){
        this.addrs.D2Common.Unit.GetUnitPosition(unit, pos)
    }

    GetUnitDistanceToPos(unit: NativePointer, x:number, y: number): number {
        return this.addrs.D2Common.Unit.GetUnitDistanceToPos(unit, x, y)
    }

    GetUnitStat(unit: NativePointer, statId: number, index = 0): number {
        return this.addrs.D2Common.Unit.GetUnitStat(unit, statId, index);
    }

    GetUnitStatByFlags(unit: NativePointer, flags: number): d2types.Stats {
        return new d2types.Stats(this.addrs.D2Common.Unit.GetUnitStatByFlags(unit, flags));
    }

    GetUnitDistance(unit: NativePointer, x: number, y: number): number {
        return this.addrs.D2Common.Unit.GetUnitDistance(unit, x, y);
    }

    FindNearestUnitFromPos(unit: NativePointer, x: number, y: number, distance: number, callback: NativeCallback<'uint32', ['pointer', 'pointer']>): d2types.Unit {
        return new d2types.Unit(this.addrs.D2Common.Unit.FindNearestUnitFromPos(unit, x, y, distance, callback));
    }
}

class D2Client_Inventory extends D2Base {
    #D2Common: D2Common;

    constructor(addrs: ID2Addrs, D2Common: D2Common) {
        super(addrs);
        this.#D2Common = D2Common;
    }

    get D2Common() {
        return this.#D2Common;
    }

    GetItemLocation(item: NativePointer): number {
        return this.addrs.D2Common.Inventory.GetItemLocation(item);
    }

    GetFirstItem(inventory: NativePointer): d2types.Unit {
        return new d2types.Unit(this.addrs.D2Common.Inventory.GetFirstItem(inventory));
    }

    GetNextItem(item: NativePointer) {
        return new d2types.Unit(this.addrs.D2Common.Inventory.GetNextItem(item));
    }

    GetCursorItem(inventory: NativePointer): d2types.Unit {
        return new d2types.Unit(this.addrs.D2Common.Inventory.GetCursorItem(inventory));
    }

    GetRecordIndex(unit: NativePointer, location: number): number {
        return this.addrs.D2Common.Inventory.GetRecordIndex(unit, location, Number(this.D2Common.IsLadder));
    }

    FindSlotsForItem(inventory: NativePointer, item: NativePointer, recordIndex: number, location: number): d2types.Position | null {
        const xy = Memory.alloc(8);
        const ok = this.addrs.D2Common.Inventory.FindSlotsForItem(inventory, item, recordIndex, xy, xy.add(4), location);
        if (!ok)
            return null;

        return new d2types.Position(xy.readU32(), xy.add(4).readU32());
    }
}

class D2Client_Item extends D2Base {
    #D2Common: D2Common;

    constructor(addrs: ID2Addrs, D2Common: D2Common) {
        super(addrs);
        this.#D2Common = D2Common;
    }

    get D2Common() {
        return this.#D2Common;
    }

    GetItemsBin(itemId: number): d2types.ItemsBin {
        return new d2types.ItemsBin(this.addrs.D2Common.Item.GetItemsBin(itemId));
    }

    GetItemQuality(item: NativePointer): D2ItemQuality {
        return this.addrs.D2Common.Item.GetItemQuality(item);
    }

    GetItemCode(unit: NativePointer): number {
        return this.addrs.D2Common.Item.GetItemCode(unit);
    }

    GetItemCodeString(unit: NativePointer): string {
        const code = this.addrs.D2Common.Item.GetItemCode(unit);
        return String.fromCharCode(code & 0xFF, (code >> 8) & 0xFF, (code >> 16) & 0xFF, (code >> 24) & 0xFF);
    }

    CheckItemType(item: NativePointer, type: number): boolean {
        return this.addrs.D2Common.Item.CheckItemType(item, type) != 0;
    }
}

export class D2Common extends D2Base {
    #level      : D2Client_Level;
    #room       : D2Client_Room;
    #unit       : D2Client_Unit;
    #inventory  : D2Client_Inventory;
    #item       : D2Client_Item;

    constructor(addrs: ID2Addrs) {
        super(addrs);

        this.#level     = new D2Client_Level(addrs, this);
        this.#room      = new D2Client_Room(addrs, this);
        this.#unit      = new D2Client_Unit(addrs, this);
        this.#inventory = new D2Client_Inventory(addrs, this);
        this.#item      = new D2Client_Item(addrs, this);
    }

    get Level() {
        return this.#level;
    }

    get Room() {
        return this.#room;
    }

    get Unit() {
        return this.#unit;
    }

    get Inventory() {
        return this.#inventory;
    }

    get Item() {
        return this.#item;
    }

    get ItemTable(): d2types.ItemTable {
        return new d2types.ItemTable(this.addrs.D2Common.ItemTable);
    }

    get IsLadder(): boolean {
        return this.addrs.D2Common.IsLadder.readU8() != 0;
    }

    // helper

    getUnitPosition(unit: NativePointer): d2types.Position {
        const pos = Memory.alloc(8);
        this.Unit.GetUnitPosition(unit, pos);
        return new d2types.Position(pos.readU32(), pos.add(4).readU32());
    }

    getUnitDistanceByPoints(pos1: d2types.Position, pos2: d2types.Position) {
        return Math.abs(Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2)))
    }

    getCurrentLevelNo(): number {
        const player = D2Game.D2Client.GetPlayerUnit();
        if (player.isNull())
            return D2LevelNo.None;

        const room = this.Room.GetRoomFromUnit(player);
        if (room.isNull())
            return D2LevelNo.None;

        return this.Room.GetLevelNoFromRoom(room);
    }

    enumInventoryItems(cb: (item: d2types.Unit) => boolean, inventory?: NativePointer) {
        if (!inventory) {
            inventory = D2Game.D2Client.GetPlayerUnit().Inventory;
        }

        for (let item = this.Inventory.GetFirstItem(inventory); !item.isNull(); item = this.Inventory.GetNextItem(item)) {
            if (item.Type != D2UnitType.Item)
                continue;

            if (cb(item))
                return item;
        }

        return null;
    }

    findNearbyUnits(source: d2types.Unit, range: number, cb: (unit: d2types.Unit, source: d2types.Unit, room1: d2types.Room1) => boolean): d2types.Unit | null {
        const room1       = this.Room.GetRoomFromUnit(source);
        const nearbyRooms = this.Room.GetNearbyRooms(room1);
        const sourcePos   = this.getUnitPosition(source);

        let targetUnit = null;
        let lastDistance = 10000;

        for (const room of nearbyRooms) {
            for (let unit = room.FirstUnit; !unit.isNull(); unit = unit.NextRoomUnit) {
                const pos = this.getUnitPosition(unit);
                const distance = this.getUnitDistanceByPoints(pos, sourcePos);

                if (distance > range || distance > lastDistance)
                    continue;

                if (!cb(unit, source, room))
                    continue;

                lastDistance = distance;
                targetUnit = unit;
            }
        }

        return targetUnit;
    }

    findCube(): d2types.Unit | null {
        return this.enumInventoryItems((item: d2types.Unit) => {
            switch (this.Inventory.GetItemLocation(item)) {
                case D2ItemLocation.Inventory:
                case D2ItemLocation.Store:
                    break;

                default:
                    return false;
            }

            if (this.Item.GetItemCodeString(item) != D2ItemCode.Cube)
                return false;

            return true;
        });
    }

    findSlotsForItem(item: NativePointer, location: number = D2ItemLocation.Cube): d2types.Position | null {
        const player = D2Game.D2Client.GetPlayerUnit();
        return this.Inventory.FindSlotsForItem(player.Inventory, item, this.Inventory.GetRecordIndex(player, location), location);
    }

    findRoomTileByLevelNo(range: number, levelNo: number): d2types.Unit | null {
        const player            = D2Game.D2Client.GetPlayerUnit();
        const room1             = this.Room.GetRoomFromUnit(player);
        const currentLevelNo    = this.Room.GetLevelNoFromRoom(room1);

        return this.findNearbyUnits(player, range, (unit: d2types.Unit, source: d2types.Unit, room1: d2types.Room1) => {
            if (unit.Type != D2UnitType.RoomTile)
                return false;

            if (this.Room.GetLevelNoFromRoom(room1) != currentLevelNo)
                return false;

            for (let tile = room1.Room2.RoomTiles; !tile.isNull(); tile = tile.Next) {
                if (tile.TargetTxtFileNo != unit.TxtFileNo)
                    continue;

                if (tile.Room2.Level.LevelNo == levelNo)
                    return true;
            }

            return false;
        });
    }
}