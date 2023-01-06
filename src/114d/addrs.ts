import { Modules } from "../modules";

export const Addrs = {
    D2Net: {
        ValidatePacket      : new NativeFunction(Modules.Game.base.add(0x12B920), 'int32', ['pointer', 'uint32', 'pointer'], 'fastcall'),
        SendPacket          : new NativeFunction(Modules.Game.base.add(0x12AE50), 'int32', ['uint32', 'uint32', 'pointer'], 'stdcall'),
    },

    D2Client: {
        MouseX              : Modules.Game.base.add(0x3A6AAC),
        MouseY              : Modules.Game.base.add(0x3A6AB0),

        GetPlayerUnit       : new NativeFunction(Modules.Game.base.add(0x063DD0), 'pointer', [], 'stdcall'),

        // GetMouseXOffset : new NativeFunction(Modules.Game.base.add(0x05AFC0), 'int32', [], 'stdcall'),
    },

    D2Common: {
        GetRoomFromUnit     : new NativeFunction(Modules.Game.base.add(0x220BB0), 'pointer', ['pointer'], 'stdcall'),
        GetLevelNoFromRoom  : new NativeFunction(Modules.Game.base.add(0x21A1B0), 'uint32', ['pointer'], 'stdcall'),
    }
};
