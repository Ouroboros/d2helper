import * as utils from '../../utils.js';
import * as types from '../types.js';
import * as d2types from '../d2types.js';
import { API } from '../../modules.js';
import { Interceptor2 } from '../../utils.js';
import { D2Game } from '../game.js';
import { D2UnitType, D2ItemQualityCN } from '../types.js';

export interface ID2Duck {
    AutoPick: {
        PrintHint           : NativePointer;
        // PickupItem          : NativePointer;
        // OnItemPickedUp      : NativePointer;
        // PutItemToCube       : NativePointer;
        // PutItemToCubeCehck1 : NativePointer;

        // CallFindNearest     : NativePointer;

        GetPickupType       : NativeFunction<number, [NativePointer]>;
    }

    MagicBag: {
        GetCertainBagWhichStoreItem : NativeFunction<NativePointer, [NativePointer, NativePointer, NativePointer, NativePointer]>;
    }

    Hackmap: {
        GetUnitHiddenType           : NativeFunction<number, [NativePointer]>;
        QuickNextGame               : NativeFunction<void, [number]>;
    }

    ItemText: {
        FormatItemProperties        : NativeFunction<void, [NativePointer, NativePointer, number, number, number]>;
        Mode3CallFormatItemProperties: NativePointer;
    }

    // FunctionPointer: {
    //     D2Common_FindNearestUnitFromPos : NativePointer;
    // }
}

export class D2DuckPatch {
    static cachedDuck: ID2Duck | null = null;

    duck: ID2Duck;

    constructor() {
        const d = D2DuckPatch.getD2Duck();
        if (d == null) {
            throw new Error('D2Duck.dll not found');
        }

        this.duck = d;
    }

    static getD2Duck(): ID2Duck | null {
        if (D2DuckPatch.cachedDuck != null)
            return D2DuckPatch.cachedDuck;

        const d2duck = Process.findModuleByName('D2Duck.dll');
        if (d2duck == null)
            return null;

        const timestamp = d2duck.base.add(d2duck.base.add(0x3C).readU32() + 8).readU32();
        switch (timestamp) {
            // case 0x6395FBE6:
            //     return {
            //         AutoPick: {
            //             PrintHint                       : d2duck.base.add(0x256C0),
            //             // PickupItem                      : d2duck.base.add(0x5EFD0),
            //             // OnItemPickedUp                  : d2duck.base.add(0x25500),
            //             // PutItemToCube                   : d2duck.base.add(0x5EE90),
            //             // PutItemToCubeCehck1             : d2duck.base.add(0x5EEEF),

            //             // CallFindNearest                 : d2duck.base.add(0x25818),
            //             GetPickupType                   : new NativeFunction(d2duck.base.add(0x25660), 'uint8', ['pointer'], 'mscdecl'),
            //         },

            //         MagicBag: {
            //             GetCertainBagWhichStoreItem     : new NativeFunction(d2duck.base.add(0x4C3C0), 'pointer', ['pointer', 'pointer', 'pointer', 'pointer'], 'mscdecl'),
            //         },

            //         Hackmap: {
            //             GetUnitHiddenType              : new NativeFunction(d2duck.base.add(0x1D5B0), 'uint8', ['pointer'], 'fastcall'),
            //         },

            //         // FunctionPointer: {
            //         //     D2Common_FindNearestUnitFromPos : d2duck.base.add(0x4A00610),
            //         // },
            //     };

            case 0x63CA4734:
                D2DuckPatch.cachedDuck = {
                    AutoPick: {
                        PrintHint                   : d2duck.base.add(0xF5171A0 - 0xF4F0000),
                        GetPickupType               : new NativeFunction(d2duck.base.add(0xF517140 - 0xF4F0000), 'uint8', ['pointer'], 'mscdecl'),
                    },

                    MagicBag: {
                        GetCertainBagWhichStoreItem : new NativeFunction(d2duck.base.add(0xF53F390 - 0xF4F0000), 'pointer', ['pointer', 'pointer', 'pointer', 'pointer'], 'mscdecl'),
                    },

                    Hackmap: {
                        GetUnitHiddenType           : new NativeFunction(d2duck.base.add(0xF50F040 - 0xF4F0000), 'uint8', ['pointer'], 'fastcall'),
                        QuickNextGame               : new NativeFunction(d2duck.base.add(0xF512780 - 0xF4F0000), 'void', ['int32'], 'mscdecl'),
                    },

                    ItemText: {
                        FormatItemProperties        : new NativeFunction(d2duck.base.add(0xF52DF00 - 0xF4F0000), 'void', ['pointer', 'pointer', 'uint32', 'uint32', 'uint32'], 'mscdecl'),

                        Mode3CallFormatItemProperties   : d2duck.base.add(0xF53003D - 0xF4F0000),
                    },
                };
        }

        return D2DuckPatch.cachedDuck;
    }

    install() {
        this.redirectHackmapCfg();
        this.showSocketedItems();

        const duck = this.duck

        const AutoPickPrintHint = Interceptor2.jmp(
            duck.AutoPick.PrintHint,
            (prefix: NativePointer, itemUnit: NativePointer) => {
                AutoPickPrintHint(prefix, itemUnit);
                this.recordImportItem(new d2types.Unit(itemUnit));
            },
            'void', ['pointer', 'pointer'], 'mscdecl',
        );

        const VK_SHIFT = API.VirtualKeyCode.VK_SHIFT;

        const QuickNextGame = Interceptor2.jmp(
            duck.Hackmap.QuickNextGame,
            (step: number) => {
                step = ptr(step).toInt32();
                QuickNextGame(step < 0 ? -step : step);
                if (step <= 0 || API.USER32.GetKeyState(VK_SHIFT) < 0) {
                    return;
                }

                let retry = 0;
                const timerId = setInterval(function() {
                    if (retry++ == 10)
                        clearInterval(timerId);

                    D2Game.D2Client.scheduleOnMainThread(function() {
                        switch (D2Game.D2Client.ClientState) {
                            case types.D2ClientState.None:
                            case types.D2ClientState.GameList:
                            {
                                if (!D2Game.D2Multi.BNCreateGameTabOnClick()) {
                                    break;
                                }

                                D2Game.D2Multi.BNCreateGameBtnOnClick();
                                clearInterval(timerId);
                                return;
                            }
                        }
                    });

                }, 500);
            },
            'void', ['uint32'], 'mscdecl',
        );
    }

    recordImportItem(item: d2types.Unit) {
        if (item.isNull())
            return;

        const fp = API.crt.wfopen(utils.UTF16('ImportItems.txt'), utils.UTF16('ab+'));
        if (fp.isNull()) {
            return;
        }

        function writeString(s: string) {
            s += '\n';
            const buf = Memory.alloc(s.length * 3);
            buf.writeUtf8String(s);
            API.crt.fwrite(buf, API.crt.strlen(buf), 1, fp);
        }

        const fileSize = API.crt._filelengthi64(API.crt._fileno(fp)).valueOf();

        switch (fileSize) {
            case 0:
            {
                const bom = Memory.alloc(3);
                bom.writeU8(0xEF).add(1).writeU8(0xBB).add(1).writeU8(0xBF);
                API.crt.fwrite(bom, 3, 1, fp);

                // fallthrough
            }

            case 3: // BOM only
                writeString('创建时间,拾取时间戳,拾取时间,游戏名,场景,物品ID,品质,名称');
                break;
        }

        const bin       = D2Game.D2Common.GetItemsBin(item.TxtFileNo);
        const name      = D2Game.D2Lang.GetStringFromIndex(bin.NameStrIndex);
        const quality   = D2Game.D2Common.GetItemQuality(item);
        const gameInfo  = D2Game.D2Client.GameInfo;
        const itemIndex = D2Game.getInstance().getItemMaphackID(item);
        // const time      = new Date().getTime();
        // const time2     = new Date(time + 8 * 3600 * 1000);
        const time      = utils.getCurrentTime().getTime();
        const time2     = utils.getCurrentTime();
        const timestr   = `${(time2.getUTCMonth() + 1).pad(2)}.${time2.getUTCDate().pad(2)} ${time2.getHours().pad(2)}:${time2.getMinutes().pad(2)}:${time2.getSeconds().pad(2)}`;

        writeString([
            `${D2Game.D2Client.gameJoinTime}`,
            `${time}`,
            `${timestr}`,
            `${gameInfo?.Name}`,
            `${D2Game.D2Client.GetLevelNameFromLevelNo(D2Game.D2Common.getCurrentLevelNo())}`,
            `${itemIndex},${D2ItemQualityCN[quality]},${name}`,
        ].join(','));

        API.crt.fclose(fp);
    }

    // fixAutoPick(duck: ID2Duck) {
    //     Interceptor2.call(
    //         duck.AutoPick.PutItemToCubeCehck1,
    //         () => {
    //             const ret = this.addrs!.D2Client.sub_486D10();

    //             if (ret == 0 || ret == 1)
    //                 return 1;

    //             if (this.addrs!.D2Client.sub_44DB30()) {
    //                 this.addrs!.D2Client.CancelTrade();
    //                 return 0;
    //             }

    //             return 1;
    //         },
    //         'uint32', [],
    //         'stdcall',
    //     );

    //     return;
    // }

    redirectHackmapCfg() {
        const fopen = Interceptor2.jmp(
            API.crt.fopen,
            (path: NativePointer, mode: NativePointer): NativePointer => {
                const filename = path.readAnsiString();

                if (filename == 'hackmap\\d2hackmap.cfg') {
                    const filename2 = utils.UTF8(filename + '.user');
                    const fp = fopen(filename2, mode);

                    if (!fp.isNull()) {
                        return fp;
                    }
                }

                return fopen(path, mode);
            },
            'pointer', ['pointer', 'pointer'], 'mscdecl',
        );
    }

    showSocketedItems() {
        // return;
        const self = this;
        const VK_SHIFT = API.VirtualKeyCode.VK_SHIFT;

        Interceptor2.call(
            this.duck.ItemText.Mode3CallFormatItemProperties,
            function(info: NativePointer, text: NativePointer, textSize: number, arg4: number, arg5: number) {
                if (API.USER32.GetKeyState(VK_SHIFT) < 0) {
                    self.duck.ItemText.FormatItemProperties(info, text, textSize, arg4, arg5);
                    return;
                }

                const viewModeInfo = new ViewItemModeInfo((this.context as Ia32CpuContext).ebx);

                const socketedItems = viewModeInfo.socketedItems as NativePointer[];
                const socketedItemUnitIds = viewModeInfo.socketedItemUnitIds;

                let lastSocketedItemUnitId = 0;

                for (let index = 0; index != socketedItemUnitIds.length; index++) {
                    socketedItems[index] = NULL;

                    const unitId = socketedItemUnitIds[index];
                    if (unitId == 0)
                        continue;

                    const item = D2Game.D2Client.FindClientSideUnit(unitId, D2UnitType.Item);

                    if (!item.isNull()) {
                        if (lastSocketedItemUnitId == 0) {
                            lastSocketedItemUnitId = unitId;
                        } else {
                            API.crt.wcscat_s(text, textSize, utils.UTF16('\n\n'));
                        }

                        const len = API.crt.wcslen(text);

                        info.add(0x10).writePointer(item);
                        self.duck.ItemText.FormatItemProperties(info, text.add(len * 2), textSize - len, arg4, arg5);
                    }
                }

                viewModeInfo.currentUnitId = lastSocketedItemUnitId;
                viewModeInfo.socketedItems = socketedItems as d2types.Unit[];
            },
            'void', ['pointer', 'pointer', 'uint32', 'uint32', 'uint32'], 'mscdecl'
        );
    }
}

class ViewItemModeInfo extends NativePointer {
    get mode() {
        return this.readU32();
    }

    get socketedItemUnitIds() {
        return [
            this.add(0x04).readU32(),
            this.add(0x08).readU32(),
            this.add(0x0C).readU32(),
            this.add(0x10).readU32(),
            this.add(0x14).readU32(),
            this.add(0x18).readU32(),
        ];
    }

    get socketedItems() {
        return [
            new d2types.Unit(this.add(0x1C).readPointer()),
            new d2types.Unit(this.add(0x20).readPointer()),
            new d2types.Unit(this.add(0x24).readPointer()),
            new d2types.Unit(this.add(0x28).readPointer()),
            new d2types.Unit(this.add(0x2C).readPointer()),
            new d2types.Unit(this.add(0x30).readPointer()),
        ];
    }

    set socketedItems(items: d2types.Unit[]) {
        this.add(0x1C).writePointer(items[0]);
        this.add(0x20).writePointer(items[1]);
        this.add(0x24).writePointer(items[2]);
        this.add(0x28).writePointer(items[3]);
        this.add(0x2C).writePointer(items[4]);
        this.add(0x30).writePointer(items[5]);
    }

    get currentUnitId() {
        return this.add(0x34).readU32();
    }

    set currentUnitId(unitId: number) {
        this.add(0x34).writeU32(unitId);
    }

    get currentItemUnit() {
        return new d2types.Unit(this.add(0x38).readPointer());
    }

    set currentItemUnit(item: NativePointer) {
        this.add(0x38).writePointer(item);
    }
}