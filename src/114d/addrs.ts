import { Modules } from "../modules";

export const Addrs = {
    D2Net: {
        ValidatePacket          : new NativeFunction(Modules.Game.base.add(0x12B920), 'int32', ['pointer', 'uint32', 'pointer'], 'fastcall'),
        SendPacket              : new NativeFunction(Modules.Game.base.add(0x12AE50), 'int32', ['uint32', 'uint32', 'pointer'], 'stdcall'),
    },

    D2Client: {
        MouseX                  : Modules.Game.base.add(0x3A6AAC),
        MouseY                  : Modules.Game.base.add(0x3A6AB0),
        GameInfo                : Modules.Game.base.add(0x3A0438),

        GetPlayerUnit           : new NativeFunction(Modules.Game.base.add(0x063DD0), 'pointer', [], 'stdcall'),
        PrintGameString         : new NativeFunction(Modules.Game.base.add(0x09E3A0), 'void', ['pointer', 'uint8'], 'fastcall'),
        PrintPartyString        : new NativeFunction(Modules.Game.base.add(0x09E5C0), 'void', ['pointer', 'uint8'], 'fastcall'),
        GetLevelNameFromLevelNo : new NativeFunction(Modules.Game.base.add(0x053E70), 'pointer', ['uint32'], 'fastcall'),

        // GetMouseXOffset : new NativeFunction(Modules.Game.base.add(0x05AFC0), 'int32', [], 'stdcall'),
    },

    D2Common: {
        ItemTable               : Modules.Game.base.add(0x56CA58),

        GetRoomFromUnit         : new NativeFunction(Modules.Game.base.add(0x220BB0), 'pointer', ['pointer'], 'stdcall'),
        GetLevelNoFromRoom      : new NativeFunction(Modules.Game.base.add(0x21A1B0), 'uint32', ['pointer'], 'stdcall'),
        GetItemsBIN             : new NativeFunction(Modules.Game.base.add(0x2335F0), 'pointer', ['uint32'], 'stdcall'),
        GetItemQuality          : new NativeFunction(Modules.Game.base.add(0x227E70), 'uint32', ['pointer'], 'stdcall'),
    },

    D2Lang: {
        GetStringFromIndex      : new NativeFunction(Modules.Game.base.add(0x124A30), 'pointer', ['uint16'], 'fastcall'),
    },
};
