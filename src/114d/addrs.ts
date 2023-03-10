import { Modules } from '../modules';

export const Addrs = {
    D2Net: {
        ValidatePacket          : new NativeFunction(Modules.Game.base.add(0x12B920), 'int32', ['pointer', 'uint32', 'pointer'], 'fastcall'),
        SendPacket              : new NativeFunction(Modules.Game.base.add(0x12AE50), 'int32', ['uint32', 'uint32', 'pointer'], 'stdcall'),
    },

    D2Common: {
        ItemTable               : Modules.Game.base.add(0x56CA58),
        IsLadder                : Modules.Game.base.add(0x3A04F4),

        Unit: {
            GetUnitCoord                : new NativeFunction(Modules.Game.base.add(0x220870), 'void', ['pointer', 'pointer'], 'stdcall'),
            GetUnitDistanceToCoord      : new NativeFunction(Modules.Game.base.add(0x2417F0), 'uint32', ['pointer', 'uint32', 'uint32'], 'stdcall'),
            GetUnitStat                 : new NativeFunction(Modules.Game.base.add(0x225480), 'uint32', ['pointer', 'uint32', 'uint32'], 'stdcall'),
            GetUnitStatByFlags          : new NativeFunction(Modules.Game.base.add(0x225760), 'pointer', ['pointer', 'uint32'], 'stdcall'),
            GetUnitDistance             : new NativeFunction(Modules.Game.base.add(0x2417F0), 'uint32', ['pointer', 'uint32', 'uint32'], 'stdcall'),
            GetPlayerData               : new NativeFunction(Modules.Game.base.add(0x2221A0), 'pointer', ['pointer'], 'stdcall'),
            FindNearestUnitFromCoord    : new NativeFunction(Modules.Game.base.add(0x25A800), 'pointer', ['pointer', 'uint32', 'uint32', 'uint32', 'pointer'], 'stdcall'),
            TestCollisionByCoordinates  : new NativeFunction(Modules.Game.base.add(0x2229F0), 'uint32', ['pointer', 'uint32', 'uint32', 'uint32'], 'stdcall'),
        },

        Room: {
            GetRoomFromUnit         : new NativeFunction(Modules.Game.base.add(0x220BB0), 'pointer', ['pointer'], 'stdcall'),
            GetLevelNoFromRoom      : new NativeFunction(Modules.Game.base.add(0x21A1B0), 'uint32', ['pointer'], 'stdcall'),
            GetAdjacentRooms        : new NativeFunction(Modules.Game.base.add(0x219790), 'void', ['pointer', 'pointer', 'pointer'], 'stdcall'),
        },

        Level: {
            GetLevelsBin            : new NativeFunction(Modules.Game.base.add(0x21DB70), 'pointer', ['uint32'], 'stdcall'),
        },

        Inventory: {
            GetItemInvPage          : new NativeFunction(Modules.Game.base.add(0x228250), 'uint8', ['pointer'], 'stdcall'),
            GetFirstItem            : new NativeFunction(Modules.Game.base.add(0x23B2C0), 'pointer', ['pointer'], 'stdcall'),
            GetNextItem             : new NativeFunction(Modules.Game.base.add(0x23DFA0), 'pointer', ['pointer'], 'stdcall'),
            GetRecordIndex          : new NativeFunction(Modules.Game.base.add(0x221050), 'uint32', ['pointer', 'uint8', 'uint32'], 'stdcall'),
            GetCursorItem           : new NativeFunction(Modules.Game.base.add(0x23C1E0), 'pointer', ['pointer'], 'stdcall'),
            FindSlotsForItem        : new NativeFunction(Modules.Game.base.add(0x23B850), 'uint32', ['pointer', 'pointer', 'uint32', 'pointer', 'pointer', 'uint8'], 'stdcall'),
        },

        Item: {
            CheckItemType           : new NativeFunction(Modules.Game.base.add(0x229BB0), 'uint32', ['pointer', 'uint32'], 'stdcall'),
            GetItemsBin             : new NativeFunction(Modules.Game.base.add(0x2335F0), 'pointer', ['uint32'], 'stdcall'),
            GetItemQuality          : new NativeFunction(Modules.Game.base.add(0x227E70), 'uint32', ['pointer'], 'stdcall'),
            GetItemCode             : new NativeFunction(Modules.Game.base.add(0x228590), 'uint32', ['pointer'], 'stdcall'),
        },

        Collision: {
            CheckMaskWithSizeXY     : new NativeFunction(Modules.Game.base.add(0x24D800), 'uint16', ['pointer', 'uint32', 'uint32', 'uint32', 'uint32', 'uint16'], 'stdcall'),
        },
    },

    D2Client: {
        MouseX                      : Modules.Game.base.add(0x3A6AAC),
        MouseY                      : Modules.Game.base.add(0x3A6AB0),
        GameInfo                    : Modules.Game.base.add(0x3A0438),
        ClientState                 : Modules.Game.base.add(0x37BBE4),
        View                        : Modules.Game.base.add(0x3A0640),
        HandleKeyDownAfterInput1    : Modules.Game.base.add(0x055BB1),
        HandleKeyDownAfterInput2    : Modules.Game.base.add(0x055BBA),
        CreateMainScreenButtons     : Modules.Game.base.add(0x033702),

        HandleCommand               : new NativeFunction(Modules.Game.base.add(0x07C420), 'uint32', ['pointer', 'pointer', 'uint32'], 'thiscall'),

        LeaveGame                   : new NativeFunction(Modules.Game.base.add(0x07F2D0), 'void', ['uint32', 'pointer'], 'fastcall'),

        GetPlayerUnit               : new NativeFunction(Modules.Game.base.add(0x063DD0), 'pointer', [], 'stdcall'),
        PrintGameString             : new NativeFunction(Modules.Game.base.add(0x09E3A0), 'void', ['pointer', 'uint8'], 'fastcall'),
        PrintPartyString            : new NativeFunction(Modules.Game.base.add(0x09E5C0), 'void', ['pointer', 'uint8'], 'fastcall'),
        GetLevelNameFromLevelNo     : new NativeFunction(Modules.Game.base.add(0x053E70), 'pointer', ['uint32'], 'fastcall'),
        FindClientSideUnit          : new NativeFunction(Modules.Game.base.add(0x63990), 'pointer', ['uint32', 'uint32'], 'fastcall'),
        FindServerSideUnit          : new NativeFunction(Modules.Game.base.add(0x639B0), 'pointer', ['uint32', 'uint32'], 'fastcall'),
        CancelTrade                 : new NativeFunction(Modules.Game.base.add(0x0B90B0), 'uint32', [], 'stdcall'),
        OnKeyDown                   : new NativeFunction(Modules.Game.base.add(0x06A840), 'void', ['pointer'], 'stdcall'),
        GetUnitName                 : new NativeFunction(Modules.Game.base.add(0x064A60), 'pointer', ['pointer'], 'fastcall'),
        IsUnitVisible               : new NativeFunction(Modules.Game.base.add(0x0DC710), 'uint32', ['pointer'], 'fastcall'),
        GetUIVars                   : new NativeFunction(Modules.Game.base.add(0x0538D0), 'uint32', ['uint32'], 'fastcall'),
        SetUIVars                   : new NativeFunction(Modules.Game.base.add(0x055F20), 'uint32', ['uint32', 'uint32', 'uint32'], 'fastcall'),

        // unknown
        // sub_486D10              : new NativeFunction(Modules.Game.base.add(0x086D10), 'uint32', []),
        // sub_44DB30              : new NativeFunction(Modules.Game.base.add(0x04DB30), 'uint32', []),

        // GetMouseXOffset : new NativeFunction(Modules.Game.base.add(0x05AFC0), 'int32', [], 'stdcall'),
    },

    D2Multi: {
        BNCreateGameTabOnClick  : new NativeFunction(Modules.Game.base.add(0x0467D0), 'uint32', ['pointer'], 'stdcall'),
        BNCreateGameBtnOnClick  : new NativeFunction(Modules.Game.base.add(0x0456D0), 'uint32', ['pointer'], 'stdcall'),

        CreateGameTabControl    : Modules.Game.base.add(0x37B070),
        WaitForBNReadyStartTime : Modules.Game.base.add(0x37BBF0),
    },

    D2Lang: {
        GetLocaleText           : new NativeFunction(Modules.Game.base.add(0x124A30), 'pointer', ['uint16'], 'fastcall'),
    },

    Storm: {
        LoadFile                : new NativeFunction(Modules.Game.base.add(0x01AAD0), 'uint32', ['pointer', 'pointer', 'uint32', 'pointer', 'uint32', 'uint32', 'uint32'], 'stdcall'),
    },
};
