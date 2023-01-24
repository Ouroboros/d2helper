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

export class ItemsBIN extends NativePointer {
    get ItemCode(): NativePointer {
        return this.add(0x80).readPointer();
    }

    get NameStrIndex(): number {
        return this.add(0xF4).readU16();
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

    get Path(): NativePointer {
        return new Path(this.add(0x2C).readPointer());
    }

    get Inventory(): NativePointer {
        return this.add(0x60).readPointer();
    }

    get ItemCode(): number {
        return this.add(0xB8).readU32();
    }

    get ItemCodeString(): string {
        return this.ItemCode.hexToString();
    }
}

export class Inventory extends NativePointer {
}

export class Path extends NativePointer {
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
