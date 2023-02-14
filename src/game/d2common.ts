import * as d2types from './d2types';
import { D2Game } from './game';
import { D2Base, ID2Addrs } from './d2base';
import { D2LevelNo, D2ItemQuality, D2UnitType, D2ItemInvPage, D2ItemCode } from './types';

class D2Common_Level extends D2Base {
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

class D2Common_Room extends D2Base {
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

    GetAdjacentRooms(room1: NativePointer): d2types.Room1[] {
        const rooms = Memory.alloc(Process.pointerSize);
        const count = Memory.alloc(4);

        this.addrs.D2Common.Room.GetAdjacentRooms(room1, rooms, count);

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

class D2Common_Unit extends D2Base {
    #D2Common: D2Common;

    constructor(addrs: ID2Addrs, D2Common: D2Common) {
        super(addrs);
        this.#D2Common = D2Common;
    }

    get D2Common() {
        return this.#D2Common;
    }

    GetUnitCoord(unit: NativePointer, pos: NativePointer){
        this.addrs.D2Common.Unit.GetUnitCoord(unit, pos)
    }

    GetUnitDistanceToPos(unit: NativePointer, x:number, y: number): number {
        return this.addrs.D2Common.Unit.GetUnitDistanceToCoord(unit, x, y)
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

    GetPlayerData(player: NativePointer): d2types.PlayerData {
        return new d2types.PlayerData(this.addrs.D2Common.Unit.GetPlayerData(player));
    }

    FindNearestUnitFromPos(unit: NativePointer, x: number, y: number, distance: number, callback: NativeCallback<'uint32', ['pointer', 'pointer']>): d2types.Unit {
        return new d2types.Unit(this.addrs.D2Common.Unit.FindNearestUnitFromCoord(unit, x, y, distance, callback));
    }

    TestCollisionByCoordinates(unit: NativePointer, x: number, y: number, flags: number): boolean {
        return this.addrs.D2Common.Unit.TestCollisionByCoordinates(unit, x, y, flags) != 0;
    }

    getUnitCoord(unit: NativePointer): d2types.Coord {
        const coord = Memory.alloc(8);
        this.GetUnitCoord(unit, coord);
        return new d2types.Coord(coord.readU32(), coord.add(4).readU32());
    }

    getUnitDistanceBetweenCoords(pos1: d2types.Coord, pos2: d2types.Coord) {
        return Math.abs(Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2)))
    }

    getCoordByDistance(pos1: d2types.Coord, pos2: d2types.Coord, distance: number): d2types.Coord {
        if (pos1.equals(pos2))
            return pos1;

        const d = this.getUnitDistanceBetweenCoords(pos1, pos2);
        const lambda = distance / (d - distance);
        const xx = (pos1.x + lambda * pos2.x) / (1 + lambda);
        const yy = (pos1.y + lambda * pos2.y) / (1 + lambda);

        return new d2types.Coord(xx, yy);
    }

    findNearbyUnits(source: d2types.Unit, range: number, cb: (unit: d2types.Unit, source: d2types.Unit, room1: d2types.Room1) => boolean): d2types.Unit | null {
        const room1         = this.D2Common.Room.GetRoomFromUnit(source);
        const adjacentRooms = this.D2Common.Room.GetAdjacentRooms(room1);
        const sourceCoord   = this.getUnitCoord(source);

        let targetUnit = null;
        let lastDistance = 10000;

        for (const room of adjacentRooms) {
            for (let unit = room.FirstUnit; !unit.isNull(); unit = unit.NextRoomUnit) {
                const coord = this.getUnitCoord(unit);
                const distance = this.getUnitDistanceBetweenCoords(coord, sourceCoord);

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
}

class D2Common_Inventory extends D2Base {
    #D2Common: D2Common;

    constructor(addrs: ID2Addrs, D2Common: D2Common) {
        super(addrs);
        this.#D2Common = D2Common;
    }

    get D2Common() {
        return this.#D2Common;
    }

    GetItemInvPage(item: NativePointer): number {
        return this.addrs.D2Common.Inventory.GetItemInvPage(item);
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

    GetRecordIndex(unit: NativePointer, page: D2ItemInvPage): number {
        return this.addrs.D2Common.Inventory.GetRecordIndex(unit, page, Number(this.D2Common.IsLadder));
    }

    FindSlotsForItem(inventory: NativePointer, item: NativePointer, recordIndex: number, page: D2ItemInvPage): d2types.Coord | null {
        const xy = Memory.alloc(8);
        const ok = this.addrs.D2Common.Inventory.FindSlotsForItem(inventory, item, recordIndex, xy, xy.add(4), page);
        if (!ok)
            return null;

        return new d2types.Coord(xy.readU32(), xy.add(4).readU32());
    }

    findSlotsForItem(item: NativePointer, page: D2ItemInvPage): d2types.Coord | null {
        const player = D2Game.D2Client.GetPlayerUnit();
        return this.FindSlotsForItem(player.Inventory, item, this.GetRecordIndex(player, page), page);
    }
}

class D2Common_Item extends D2Base {
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

class D2Common_Collision extends D2Base {
    #D2Common: D2Common;

    constructor(addrs: ID2Addrs, D2Common: D2Common) {
        super(addrs);
        this.#D2Common = D2Common;
    }

    get D2Common() {
        return this.#D2Common;
    }

    CheckMaskWithSizeXY(room: NativePointer, x: number, y: number, w: number, h: number, mask: number) {
        return this.addrs.D2Common.Collision.CheckMaskWithSizeXY(room, x, y, w, h, mask);
    }
}

export class D2Common extends D2Base {
    #level      : D2Common_Level;
    #room       : D2Common_Room;
    #unit       : D2Common_Unit;
    #inventory  : D2Common_Inventory;
    #item       : D2Common_Item;
    #collision  : D2Common_Collision;

    constructor(addrs: ID2Addrs) {
        super(addrs);

        this.#level     = new D2Common_Level(addrs, this);
        this.#room      = new D2Common_Room(addrs, this);
        this.#unit      = new D2Common_Unit(addrs, this);
        this.#inventory = new D2Common_Inventory(addrs, this);
        this.#item      = new D2Common_Item(addrs, this);
        this.#collision = new D2Common_Collision(addrs, this);
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

    get Collision() {
        return this.#collision;
    }

    get ItemTable(): d2types.ItemTable {
        return new d2types.ItemTable(this.addrs.D2Common.ItemTable);
    }

    get IsLadder(): boolean {
        return this.addrs.D2Common.IsLadder.readU8() != 0;
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

    findCube(): d2types.Unit | null {
        return this.enumInventoryItems((item: d2types.Unit) => {
            switch (this.Inventory.GetItemInvPage(item)) {
                case D2ItemInvPage.Inventory:
                case D2ItemInvPage.Stash:
                    break;

                default:
                    return false;
            }

            if (this.Item.GetItemCodeString(item) != D2ItemCode.Cube)
                return false;

            return true;
        });
    }

    findRoomTileByLevelNo(range: number, levelNo: number): d2types.Unit | null {
        const player            = D2Game.D2Client.GetPlayerUnit();
        const room1             = this.Room.GetRoomFromUnit(player);
        const currentLevelNo    = this.Room.GetLevelNoFromRoom(room1);

        return this.Unit.findNearbyUnits(player, range, (unit: d2types.Unit, source: d2types.Unit, room1: d2types.Room1) => {
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