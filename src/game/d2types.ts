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
    get TxtFileNo() {
        return this.add(4).readU32();
    }
}
