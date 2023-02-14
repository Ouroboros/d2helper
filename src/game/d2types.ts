import { D2UnitType, D2InventoryGrids } from "./types";

export class Coord {
    x: number;
    y: number;

    static default(): Coord {
        return new Coord(0, 0);
    }

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    equals(p: Coord): boolean {
        return this.x == p.x && this.y == p.y;
    }

    set(p: Coord): Coord {
        this.x = p.x;
        this.y = p.y;
        return this;
    }

    toString(): string {
        return `{x:${Math.floor(this.x)},y:${Math.floor(this.y)}}`;
    }
}

export class GameInfo extends NativePointer {
    get Name(): string {
        return this.add(0x1F).readAnsiString()!;
    }

    get ServerIp(): string {
        return this.add(0x37).readAnsiString()!;
    }

    get AccountName(): string {
        return this.add(0x8D).readAnsiString()!;
    }

    get CharName(): string {
        return this.add(0xBD).readAnsiString()!;
    }

    get RealmName(): string {
        return this.add(0xD5).readAnsiString()!;
    }

    get Password(): string {
        return this.add(0x245).readAnsiString()!;
    }
}

export class ItemTable extends NativePointer {
    get TotalCount(): number {
        return this.readU32();
    }

    get WeaponTable(): NativePointer {
        return this.add(0x08).readPointer();
    }

    get WeaponTableCount(): number {
        return this.add(0x0C).readU32();
    }

    get ArmorTable(): NativePointer {
        return this.add(0x10).readPointer();
    }

    get ArmorTableCount(): number {
        return this.add(0x14).readU32();
    }

    get MiscTable(): NativePointer {
        return this.add(0x18).readPointer();
    }

    get MiscTableCount(): number {
        return this.add(0x1C).readU32();
    }
}

export class ItemsBin extends NativePointer {
    get ItemCode(): NativePointer {
        return this.add(0x80).readPointer();
    }

    get NameStrIndex(): number {
        return this.add(0xF4).readU16();
    }
}

export class LevelsBin extends NativePointer {
    get LevelNo() {
        return this.readU32();
    }

    get LevelNameKey() {
        return this.add(0xF5).readUtf8String();
    }

    get LevelWarpKey() {
        return this.add(0x11D).readUtf8String();
    }

    get LevelName() {
        return this.add(0x16E).readUtf16String();
    }

    get LevelWarpName() {
        return this.add(0x1BE).readUtf8String();
    }
}

export class Unit extends NativePointer {
    get Type(): number {
        return this.readU32();
    }

    get TxtFileNo(): number {
        return this.add(4).readU32();
    }

    get ID(): number {
        return this.add(0x0C).readU32();
    }

    get Mode(): number {
        return this.add(0x10).readU32();
    }

    get PlayerData(): PlayerData {
        if (this.Type != D2UnitType.Player)
            throw new Error(`unit type != Player: ${this.Type}`);

        return new PlayerData(this.add(0x14).readPointer());
    }

    get Act(): NativePointer {
        return this.add(0x1C).readPointer();
    }

    get Path(): Path {
        return new Path(this.add(0x2C).readPointer());
    }

    get ObjectPath(): ObjectPath {
        return new ObjectPath(this.add(0x2C).readPointer());
    }

    get ItemPath(): ItemPath {
        return new ItemPath(this.add(0x2C).readPointer());
    }

    get Inventory(): Inventory {
        return new Inventory(this.add(0x60).readPointer());
    }

    get ItemCode(): number {
        return this.add(0xB8).readU32();
    }

    get Flags(): number {
        return this.add(0xC4).readU32();
    }

    get Flags2(): number {
        return this.add(0xC8).readU32();
    }

    get NextRoomUnit(): Unit {
        return new Unit(this.add(0xE8).readPointer());
    }

    get ItemCodeString(): string {
        return this.ItemCode.hexToString();
    }

    isVisible() {
        return (this.Flags2 & 0x80) != 0;
    }
}

export class PlayerData extends NativePointer {

}

export class Room1 extends NativePointer {
    get Room2(): Room2 {
        return new Room2(this.add(0x10).readPointer());
    }

    get FirstUnit(): Unit {
        return new Unit(this.add(0x74).readPointer());
    }
}

export class Room2 extends NativePointer {
    get RoomTiles(): RoomTile {
        return new RoomTile(this.add(0x4C).readPointer());
    }

    get Level(): Level {
        return new Level(this.add(0x58).readPointer());
    }
}

export class Level extends NativePointer {
    get LevelNo() {
        return this.add(0x1D0).readU32();
    }
}

export class RoomTile extends NativePointer {
    get Room2(): Room2 {
        return  new Room2(this.readPointer());
    }

    get Next(): RoomTile {
        return new RoomTile(this.add(4).readPointer());
    }

    get TargetTxtFileNo(): number | null {
        const p = this.add(0x10).readPointer();
        return p.isNull() ? null : p.readU32();
    }
}

export class Path extends NativePointer {
    get X(): number {
        return this.add(0x2).readU16();
    }

    set X(x: number) {
        this.add(2).writeU16(x);
    }

    get Y(): number {
        return this.add(0x6).readU16();
    }

    set Y(y: number) {
        this.add(6).writeU16(y);
    }

    get Room1(): Room1 {
        return new Room1(this.add(0x1C).readPointer());
    }
}

export class ObjectPath extends NativePointer {
    get Room(): NativePointer {
        return this.readPointer();
    }

    get X(): number {
        return this.add(0xC).readU32();
    }

    get Y(): number {
        return this.add(0x10).readU32();
    }
}

export class ItemPath extends NativePointer {
    get X(): number {
        return this.add(0xC).readU32();
    }

    get Y(): number {
        return this.add(0x10).readU32();
    }
}

export class Inventory extends NativePointer {
    GetGrid(gridIndex: number): InventoryGrid {
        return new InventoryGrid(this.add(0x14).readPointer().add(InventoryGrid.GRID_SIZE * gridIndex));
    }

    GetInventoryGrid(invIndex: number): InventoryGrid {
        invIndex += D2InventoryGrids.Inventory;
        return new InventoryGrid(this.add(0x14).readPointer().add(InventoryGrid.GRID_SIZE * invIndex));
    }

    get GridCount(): number {
        return this.add(0x18).readU32();
    }
}

export class InventoryGrid extends NativePointer {
    static GRID_SIZE = 0x10;

    get FirstItem(): Unit {
        return new Unit(this.readPointer());
    }

    get LastItem(): Unit {
        return new Unit(this.add(4).readPointer());
    }

    get Width(): number {
        return this.add(8).readU8();
    }

    get Height(): number {
        return this.add(9).readU8();
    }

    get Items(): Unit[] {
        const count = this.Width * this.Height;
        const p = this.add(0xC).readPointer();
        return Array.from(Array(count), (_, index) => new Unit(p.add(index * 4).readPointer()));
    }
}

export class Stat extends NativePointer {
    get Index(): number {
        return this.readU16();
    }

    get ID(): number {
        return this.add(2).readU16();
    }

    get Value(): number {
        return this.add(4).readU32();
    }
}

export class StatVector extends NativePointer {
    get Stats(): NativePointer {
        return this.readPointer();
    }

    get Count(): number {
        return this.add(4).readU16();
    }

    get Capacity(): number {
        return this.add(6).readU16();
    }

    at(index: number): Stat {
        return new Stat(this.Stats.add(index * 8));
    }
}

export class Stats extends NativePointer {
    get UnitID(): number {
        return this.readU32();
    }

    get Unit(): Unit {
        return new Unit(this.add(4).readPointer());
    }

    get BaseStats(): StatVector {
        return new StatVector(this.add(0x24));
    }
}

// .\\GAME\\View.cpp
export class View extends NativePointer {
    get Walls(): Wall2[] {
        const arr = this.add(0xEAA8).readPointer();
        const count = this.WallCount;
        const SIZE_OF_WALL2 = 0x24;

        return Array.from(Array(count * count), (_, index) => new Wall2(arr.add(index * SIZE_OF_WALL2)));
    }

    get WallCount(): number {
        return this.add(0xEAB0).readU32();
    }
}

// .\\GAME\\Wall2.cpp
export class Wall2 extends NativePointer {
    get Floor(): Floor {
        return new Floor(this.add(0x10).readPointer());
    }
}

export class Floor extends NativePointer {
    get Flags() {
        return this.readU32();
    }

    get Unit() {
        return new Unit(this.add(0x0C).readPointer());
    }

    get Next(): Floor {
        return new Floor(this.add(0x10).readPointer());
    }
}
