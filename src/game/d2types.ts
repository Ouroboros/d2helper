export class Position {
    x: number;
    y: number;

    static default(): Position {
        return new Position(0, 0);
    }

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    equals(p: Position): boolean {
        return this.x == p.x && this.y == p.y;
    }

    set(p: Position): Position {
        this.x = p.x;
        this.y = p.y;
        return this;
    }

    toString(): string {
        return `{x:${this.x},y:${this.y}}`;
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

    get NextRoomUnit(): Unit {
        return new Unit(this.add(0xE8).readPointer());
    }

    get ItemCodeString(): string {
        return this.ItemCode.hexToString();
    }
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

    get Y(): number {
        return this.add(0x6).readU16();
    }

    set X(x: number) {
        this.add(2).writeU16(x);
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
