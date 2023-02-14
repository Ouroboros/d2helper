export interface ID2Addrs {
    D2Net: {
        ValidatePacket                  : NativeFunction<number, [NativePointerValue, number, NativePointerValue]>;
        SendPacket                      : NativeFunction<number, [number, number, NativePointerValue]>;
    }

    D2Common: {
        ItemTable                       : NativePointer;
        IsLadder                        : NativePointer;

        Unit: {
            GetUnitCoord                : NativeFunction<void, [NativePointer, NativePointer]>;
            GetUnitDistanceToCoord      : NativeFunction<number, [NativePointer, number, number]>;
            GetUnitStat                 : NativeFunction<number, [NativePointer, number, number]>;
            GetUnitStatByFlags          : NativeFunction<NativePointer, [NativePointer, number]>;
            GetUnitDistance             : NativeFunction<number, [NativePointer, number, number]>;
            GetPlayerData               : NativeFunction<NativePointer, [NativePointer]>;
            FindNearestUnitFromCoord    : NativeFunction<NativePointer, [NativePointer, number, number, number, NativePointer]>;
            TestCollisionByCoordinates  : NativeFunction<number, [NativePointer, number, number, number]>;
        }

        Room: {
            GetAdjacentRooms            : NativeFunction<void, [NativePointer, NativePointer, NativePointer]>;
            GetRoomFromUnit             : NativeFunction<NativePointer, [NativePointer]>;
            GetLevelNoFromRoom          : NativeFunction<number, [NativePointer]>;
        }

        Level: {
            GetLevelsBin                : NativeFunction<NativePointer, [number]>;
        }

        Inventory: {
            GetItemInvPage              : NativeFunction<number, [NativePointer]>;
            GetFirstItem                : NativeFunction<NativePointer, [NativePointer]>;
            GetNextItem                 : NativeFunction<NativePointer, [NativePointer]>;
            GetRecordIndex              : NativeFunction<number, [NativePointer, number, number]>;
            GetCursorItem               : NativeFunction<NativePointer, [NativePointer]>;
            FindSlotsForItem            : NativeFunction<number, [NativePointer, NativePointer, number, NativePointer, NativePointer, number]>;
        }

        Item: {
            CheckItemType               : NativeFunction<number, [NativePointer, number]>;
            GetItemsBin                 : NativeFunction<NativePointer, [number]>;
            GetItemQuality              : NativeFunction<number, [NativePointer]>;
            GetItemCode                 : NativeFunction<number, [NativePointer]>;
        }

        Collision: {
            CheckMaskWithSizeXY         : NativeFunction<number, [NativePointer, number, number, number, number, number]>;
        }
    }

    D2Client: {
        MouseX                          : NativePointer;
        MouseY                          : NativePointer;
        GameInfo                        : NativePointer;
        ClientState                     : NativePointer;
        View                            : NativePointer;
        HandleKeyDownAfterInput1        : NativePointer;
        HandleKeyDownAfterInput2        : NativePointer;
        CreateMainScreenButtons         : NativePointer;

        HandleCommand                   : NativeFunction<number, [NativePointer, NativePointer, number]>;

        LeaveGame                       : NativeFunction<void, [number, NativePointer]>;

        GetPlayerUnit                   : NativeFunction<NativePointer, []>;
        PrintGameString                 : NativeFunction<void, [NativePointer, number]>;
        PrintPartyString                : NativeFunction<void, [NativePointer, number]>;
        GetLevelNameFromLevelNo         : NativeFunction<NativePointer, [number]>;
        FindClientSideUnit              : NativeFunction<NativePointer, [number, number]>;
        FindServerSideUnit              : NativeFunction<NativePointer, [number, number]>;
        CancelTrade                     : NativeFunction<number, []>;
        OnKeyDown                       : NativeFunction<void, [NativePointer]>;
        GetUnitName                     : NativeFunction<NativePointer, [NativePointer]>;
        IsUnitVisible                   : NativeFunction<number, [NativePointer]>;
        GetUIVars                       : NativeFunction<number, [number]>;
        SetUIVars                       : NativeFunction<number, [number, number, number]>;

        // unknown
        // sub_486D10              : NativeFunction<number, []>;
        // sub_44DB30              : NativeFunction<number, []>;
    }

    D2Multi: {
        BNCreateGameTabOnClick  : NativeFunction<number, [NativePointer]>;
        BNCreateGameBtnOnClick  : NativeFunction<number, [NativePointer]>;

        CreateGameTabControl    : NativePointer;
        WaitForBNReadyStartTime : NativePointer;
    }

    D2Lang: {
        GetLocaleText      : NativeFunction<NativePointer, [number]>;
    }

    Storm: {
        LoadFile                : NativeFunction<number, [NativePointer, NativePointer, number, NativePointer, number, number, number]>;
    }
}

export class D2Base {
    private _addrs: ID2Addrs;

    constructor(addrs: ID2Addrs) {
        this._addrs = addrs
    }

    get addrs(): ID2Addrs {
        return this._addrs;
    }
}