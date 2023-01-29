export enum D2ClientCmd {
    WALKTOLOCATION              = 0x01,
    WALKTOENTITY                = 0x02,
    RUNTOLOCATION               = 0x03,
    RUNTOENTITY                 = 0x04,
    LEFTSKILLONLOCATION         = 0x05,
    LEFTSKILLONENTITY           = 0x06,
    LEFTSKILLONENTITYEX         = 0x07,
    LEFTSKILLONLOCATIONEX       = 0x08,
    LEFTSKILLONENTITYEX2        = 0x09,
    LEFTSKILLONENTITYEX3        = 0x0A,
    RIGHTSKILLONLOCATION        = 0x0C,
    RIGHTSKILLONENTITY          = 0x0D,
    RIGHTSKILLONENTITYEX        = 0x0E,
    RIGHTSKILLONLOCATIONEX      = 0x0F,
    RIGHTSKILLONENTITYEX2       = 0x10,
    RIGHTSKILLONENTITYEX3       = 0x11,
    SET_INFERNO_STATE           = 0x12,
    INTERACTWITHENTITY          = 0x13,
    OVERHEADMESSAGE             = 0x14,
    CHAT                        = 0x15,
    PICKUPITEM                  = 0x16,
    DROPITEM                    = 0x17,
    ITEMTOBUFFER                = 0x18,
    PICKUPBUFFERITEM            = 0x19,
    ITEMTOBODY                  = 0x1A,
    SWAP2HANDEDITEM             = 0x1B,
    PICKUPBODYITEM              = 0x1C,
    SWITCHBODYITEM              = 0x1D,
    SWITCH1H_2H                 = 0x1E,
    SWITCHINVENTORYITEM         = 0x1F,
    USEITEM                     = 0x20,
    STACKITEM                   = 0x21,
    REMOVESTACKITEM             = 0x22,
    ITEMTOBELT                  = 0x23,
    REMOVEBELTITEM              = 0x24,
    SWITCHBELTITEM              = 0x25,
    USEBELTITEM                 = 0x26,
    IDENTIFYITEM                = 0x27,
    INSERTSOCKETITEM            = 0x28,
    SCROLLTOTOME                = 0x29,
    ITEMTOCUBE                  = 0x2A,
    NPC_INIT                    = 0x2F,
    NPC_CANCEL                  = 0x30,
    QUESTMESSAGE                = 0x31,
    NPC_BUY                     = 0x32,
    NPC_SELL                    = 0x33,
    NPC_IDENTIFYITEMS           = 0x34,
    REPAIR                      = 0x35,
    HIREMERC                    = 0x36,
    IDENTIFYGAMBLE              = 0x37,
    ENTITYACTION                = 0x38,
    ADDSTAT                     = 0x3A,
    ADDSKILL                    = 0x3B,
    SELECTSKILL                 = 0x3C,
    CLOSEDOOR                   = 0x3D,
    ACTIVATEITEM                = 0x3E,
    CHARACTERPHRASE             = 0x3F,
    UDPATEQUESTS                = 0x40,
    RESURRECT                   = 0x41,
    STAFFINORIFICE              = 0x44,
    MERC_INTERACT               = 0x46,
    MERC_MOVE                   = 0x47,
    BUSYSTATE_OFF               = 0x48,
    WAYPOINT                    = 0x49,
    REQUESTENTITYUPDATE         = 0x4B,
    TRANSMORGIFY                = 0x4C,
    PLAYNPCMESSAGE              = 0x4D,
    CLICKBUTTON                 = 0x4F,
    DROPGOLD                    = 0x50,
    BINDHOTKEY                  = 0x51,
    STAMINA_ON                  = 0x53,
    STAMINA_OFF                 = 0x54,
    QUESTCOMPLETED              = 0x58,
    MAKEENTITYMOVE              = 0x59,
    SQUELCH_HOSTILE             = 0x5D,
    PARTY                       = 0x5E,
    UPDATEPLAYERPOS             = 0x5F,
    SWAPWEAPON                  = 0x60,
    MERC_ITEM                   = 0x61,
    MERC_RESSURECT              = 0x62,
    ITEM_TOBELT                 = 0x63,
    WARDEN                      = 0x66,
    GAMELOGON_SP                = 0x67,
    GAMELOGON_MULTI             = 0x68,
    LEAVEGAME                   = 0x69,
    REQUESTHOSTEDGAMES          = 0x6A,
    JOINGAME                    = 0x6B,
    UPLOADSAVE                  = 0x6C,
    PING                        = 0x6D,
    FINDME_6E                   = 0x6E,
    FINDME_70                   = 0x70,
}

export enum D2GSCmd {
    GAMELOADING                 = 0x00,
    GAMEFLAGS                   = 0x01,
    LOADSUCCESSFUL              = 0x02,
    LOADACT                     = 0x03,
    LOADCOMPLETE                = 0x04,
    UNLOADCOMPLETE              = 0x05,
    GAMEEXIT                    = 0x06,
    MAPREVEAL                   = 0x07,
    MAPHIDE                     = 0x08,
    ASSIGNLVLWARP               = 0x09,
    REMOVEOBJECT                = 0x0A,
    GAMEHANDSHAKE               = 0x0B,
    NPC_HIT                     = 0x0C,
    PLAYERSTOP                  = 0x0D,
    OBJECTSTATE                 = 0x0E,
    PLAYERMOVE                  = 0x0F,
    CHARTOOBJ                   = 0x10,
    REPORTKILL                  = 0x11,
    REASSIGNPLAYER              = 0x15,
    MANYUNITSCOORDSUPDATE       = 0x16,
    UNKNOWN_17                  = 0x17,
    HPMPUPDATE2                 = 0x18,
    SMALLGOLDPICKUP             = 0x19,
    ADDEXP_BYTE                 = 0x1A,
    ADDEXP_WORD                 = 0x1B,
    ADDEXP_DWORD                = 0x1C,
    SETATTR_BYTE                = 0x1D,
    SETATTR_WORD                = 0x1E,
    SETATTR_DWORD               = 0x1F,
    ATTRIBUTEUPDATE             = 0x20,
    UPDATEITEM_OSKILL           = 0x21,
    UPDATEITEM_SKILL            = 0x22,
    SETSKILL                    = 0x23,
    CHAT                        = 0x26,
    NPC_INFO                    = 0x27,
    PLAYERQUESTINFO             = 0x28,
    GAMEQUESTLOG                = 0x29,
    NPCTRANSACTION              = 0x2A,
    PLAYSOUND                   = 0x2C,
    UPDATEITEMSTATS             = 0x3E,
    USESTACKABLEITEM            = 0x3F,
    ITEMFLAGSETTER              = 0x40,
    CLEARCURSOR                 = 0x42,
    RELATOR1                    = 0x47,
    RELATOR2                    = 0x48,
    UNITCASTSKILL_TARGET        = 0x4C,
    UNITCASTSKILL_XY            = 0x4D,
    MERCFORHIRE                 = 0x4E,
    CLEARMERCLIST               = 0x4F,
    QUEST_SPECIAL               = 0x50,
    WORLDOBJECT                 = 0x51,
    PLAYERQUESTLOG              = 0x52,
    DARKNESS                    = 0x53,
    NPC_ENCHANTS                = 0x57,
    OPENUI                      = 0x58,
    ASSIGNPLAYER                = 0x59,
    EVENTMESSAGES               = 0x5A,
    PLAYER_JOIN                 = 0x5B,
    PLAYER_LEAVE                = 0x5C,
    QUESTSTATE                  = 0x5D,
    GAME_QUESTS_AVAILABILITY    = 0x5E,
    PORTAL_FLAGS                = 0x5F,
    TOWNPORTALSTATE             = 0x60,
    CANGOTOACT                  = 0x61,
    MAKEUNITTARGETABLE          = 0x62,
    WAYPOINTMENU                = 0x63,
    PLAYERKILLCOUNT             = 0x65,
    NPC_MOVE                    = 0x67,
    NPC_MOVETOENTITY            = 0x68,
    NPC_STATE                   = 0x69,
    NPC_UNKNOWN_0x6A            = 0x6A,
    NPC_ACTION                  = 0x6B,
    NPC_ATTACK                  = 0x6C,
    NPC_STOP                    = 0x6D,
    MISSILEDATA                 = 0x73,
    PLAYERCORPSEASSIGN          = 0x74,
    PLAYERPARTYINFO             = 0x75,
    PLAYERINPROXIMITY           = 0x76,
    TRADEACTION                 = 0x77,
    TRADEACCEPTED               = 0x78,
    GOLDINTRADE                 = 0x79,
    SUMMONLOG                   = 0x7A,
    ASSIGNHOTKEY                = 0x7B,
    USESCROLL                   = 0x7C,
    SETITEMFLAGS                = 0x7D,
    CMNCOF                      = 0x7E,
    ALLYPARTYINFO               = 0x7F,
    ASSIGNMERC                  = 0x81,
    PORTALOWNERSHIP             = 0x82,
    UNIQUEEVENTS                = 0x89,
    NPC_WANTSINTERACT           = 0x8A,
    PLAYERRELATIONSHIP          = 0x8B,
    RELATIONSHIPUPDATE          = 0x8C,
    ASSIGNPLAYERTOPARTY         = 0x8D,
    CORPSEASSIGN                = 0x8E,
    PONG                        = 0x8F,
    PARTYAUTOMAPINFO            = 0x90,
    NPCGOSSIP                   = 0x91,
    REMOVEITEMSDISPLAY          = 0x92,
    UNKNOWN_UNITSKILL_0x93      = 0x93,
    SKILLSLIST                  = 0x94,
    HPMPUPDATE                  = 0x95,
    WALKVERIFY                  = 0x96,
    WEAPONSWITCH                = 0x97,
    EVILHUT                     = 0x98,
    UNITSKILLCAST_TARGET        = 0x99,
    UNITSKILLCAST_XY            = 0x9A,
    MERCREVIVECOST              = 0x9B,
    ITEM_WORLD                  = 0x9C,
    ITEM_OWNED                  = 0x9D,
    MERCATTRIBUTE_BYTE          = 0x9E,
    MERCATTRIBUTE_WORD          = 0x9F,
    MERCATTRIBUTE_DWORD         = 0xA0,
    MERC_ADDEXP_BYTE            = 0xA1,
    MERC_ADDEXP_WORD            = 0xA2,
    SKILL_AURA_STAT             = 0xA3,
    BAALWAVES                   = 0xA4,
    STATE_SKILL_MOVE            = 0xA5,
    RUNES_TXT                   = 0xA6,
    DELAYSTATE                  = 0xA7,
    SETSTATE                    = 0xA8,
    ENDSTATE                    = 0xA9,
    MULTISTATES                 = 0xAA,
    NPC_HEAL                    = 0xAB,
    MONSTERPACKET               = 0xAC,
    WARDEN                      = 0xAE,
    STARTLOGON                  = 0xAF,
    CONNECTIONTERMINATED        = 0xB0,
    GAMESINFO                   = 0xB2,
    DOWNLOADSAVE                = 0xB3,
    CONNECTIONREFUSED           = 0xB4,
}

export enum D2ClientState {
    None                        = 0,
    CreatingGame                = 1,
    InGame                      = 2,
    GameList                    = 3,
}

export enum D2SkillID {
    None                        = 0,
    Sor_Teleport                = 54,       // TP
    Sor_ThunderStorm            = 57,       // 雷云风暴
    Dru_Werewolf                = 223,      // dru-变狼
    Dru_OakSage                 = 226,      // dru-橡木智者
    Dru_Hurricane               = 250,      // dru-暴风
    UnskilledTeleport           = 581,      // 闪现
    CreateCowPortal             = 582,      // 开牛门
    Dru_Boost                   = 615,      // dru-爆气
    Dru_Teleport                = 654,      // dru-突袭
}

export enum D2StateID {
    SkillCooldown               = 0x79,
    Hurricane                   = 0x90,     // dru-暴风
}

export enum D2LevelNo {
    None                        = 0x00,
    RogueEncampment             = 0x01,     // 罗格营地
    LutGholein                  = 0x28,     // 鲁高因
    KurastDocks                 = 0x4B,     // 库拉斯特海港
    PandemoniumFortress         = 0x67,     // 群魔堡垒
    Harrogath                   = 0x6D,     // 哈洛加斯
    Cow1                        = 137,      // 牛一
    Cow2                        = 151,      // 牛二
}

export enum D2UnitType {
    Player                      = 0,
    Monster                     = 1,
    Object                      = 2,
    Missile                     = 3,
    Item                        = 4,
    RoomTile                    = 5,
}

export enum D2ItemType {
    Gold                        = 4,
}

export enum D2UnitPlayerMode {
    DEATH                       = 0,        // death
    STAND_OUTTOWN               = 1,        // standing outside town
    WALK_OUTTOWN                = 2,        // walking outside town
    RUN                         = 3,        // running
    BEING_HIT                   = 4,        // being hit
    STAND_INTOWN                = 5,        // standing inside town
    WALK_INTOWN                 = 6,        // walking outside town
    ATTACK1                     = 7,        // attacking 1
    ATTACK2                     = 8,        // attacking 2
    BLOCK                       = 9,        // blocking
    CAST                        = 10,       // casting spell
    THROW                       = 11,       // throwing
    KICK                        = 12,       // kicking (assassin)
    USESKILL1                   = 13,       // using skill 1
    USESKILL2                   = 14,       // using skill 2
    USESKILL3                   = 15,       // using skill 3
    USESKILL4                   = 16,       // using skill 4
    DEAD                        = 17,       // dead
    SEQUENCE                    = 18,       // sequence
    BEING_KNOCKBACK             = 19,
}

export enum D2UnitItemMode {
    InvOrCube                   = 0,
    Equipped                    = 1,
    InBelt                      = 2,
    OnGround                    = 3,
    OnCursor                    = 4,
    BeingDropped                = 5,
    SocketedInItem              = 6,
}

export enum D2ItemFlags {
    NewItem                     = 0x00000001,
    Magical                     = 0x00000010,
    Socketed                    = 0x00000800,
    Ear                         = 0x00001000,
    Newitem2                    = 0x00002000,
    CheckSecPrice               = 0x00010000,
    ChackGamblePrice            = 0x00020000,
    Etheral                     = 0x00400000,
    FromPlayer                  = 0x01000000,
}

export enum D2ItemLocation {
    Inventory                   = 0,
    Cube                        = 3,
    Store                       = 4,
    Equipped                    = 0xFF,
}

export enum D2ItemQuality {
    Cracked                     = 1,        // 粗糙的
    Normal                      = 2,        // 普通的
    Superior                    = 3,        // 超强的
    Magic                       = 4,        // 魔法的
    Set                         = 5,        // 套装的
    Rare                        = 6,        // 精华的
    Unique                      = 7,        // 暗金的
    Crafted                     = 8,        // 手工的
    Tempered                    = 9,        // 暗绿的
}

export enum D2ItemQualityCN {
    粗糙的                      = 1,
    普通的                      = 2,
    超强的                      = 3,
    魔法的                      = 4,
    套装的                      = 5,
    精华的                      = 6,
    暗金的                      = 7,
    手工的                      = 8,
}

export enum D2StringColor {
    Default                     = -1,
    White                       = 0,
    Red                         = 1,
    Green                       = 2,
    Blue                        = 3,
    Gold                        = 4,
    Grey                        = 5,
    Black                       = 6,
    Gold2                       = 7,
    Orange                      = 8,
    Yellow                      = 9,
    DarkeGreen2                 = 10,
    Purple                      = 11,
    DarkGreen                   = 12,
}

export enum D2CharClass {
    AMA                         = 0,
    SOR                         = 1,
    NEC                         = 2,
    PAL                         = 3,
    BAR                         = 4,
    DRU                         = 5,
    ASN                         = 6,
}

export enum D2StatID {
    HP                          = 6,
    MaxHP                       = 7,
    Mana                        = 8,
    MaxMana                     = 9,
    ColdResist                  = 43,
    Durability                  = 72,
    MaxDurability               = 73,
}

export namespace D2GSPacket {
    class Base {
        private ptr: NativePointer;

        constructor(ptr: NativePointer) {
            this.ptr = ptr;
        }
    }

    export class MapReveal extends Base {
        tileX           : number;
        tileY           : number;
        levelNo         : number;

        constructor(ptr: NativePointer) {
            super(ptr);

            this.tileX      = ptr.add(0x01).readU8();
            this.tileY      = ptr.add(0x03).readU32();
            this.levelNo    = ptr.add(0x05).readU8();
        }
    }

    export class SetSkill extends Base {
        unitTypeUnused  : number;
        unitGUID        : number;
        hand            : number;
        skillId         : number;
        itemGUID        : number;

        constructor(ptr: NativePointer) {
            super(ptr);

            this.unitTypeUnused = ptr.add(0x01).readU8();
            this.unitGUID       = ptr.add(0x02).readU32();
            this.hand           = ptr.add(0x06).readU8();
            this.skillId        = ptr.add(0x07).readU16();
            this.itemGUID       = ptr.add(0x09).readU32();
        }

        get leftHand(): boolean {
            return this.hand == 1;
        }
    }

    export class SetState extends Base {
        unitType        : number;
        unitGUID        : number;
        fullPacketSize  : number;
        state           : number;

        constructor(ptr: NativePointer) {
            super(ptr);

            this.unitType       = ptr.add(0x01).readU8();
            this.unitGUID       = ptr.add(0x02).readU32();
            this.fullPacketSize = ptr.add(0x06).readU8();
            this.state          = ptr.add(0x07).readU8();
        }
    }

    export class EndState extends Base {
        unitType        : number;
        unitGUID        : number;
        state           : number;

        constructor(ptr: NativePointer) {
            super(ptr);

            this.unitType       = ptr.add(0x01).readU8();
            this.unitGUID       = ptr.add(0x04).readU32();
            this.state          = ptr.add(0x08).readU8();
        }
    }

    export class WalkVerify extends Base {
        stamina : number;
        x       : number;
        y       : number;

        constructor(ptr: NativePointer) {
            super(ptr);

            this.stamina    = ptr.add(0x01).readU16();
            this.x          = ptr.add(0x03).readU16();
            this.y          = ptr.add(0x05).readU16();

            this.y = ((this.y & 0x7FFF) << 1) | (this.x >> 15);
            this.x = ((this.x & 0x7FFF) << 1) | (this.stamina >> 15);
            this.stamina &= 0x7FFF;
        }
    }

    export class ReassignPlayer extends Base {
        unitType    : number;
        unitGUID    : number;
        x           : number;
        y           : number;
        bool        : number;

        constructor(ptr: NativePointer) {
            super(ptr);

            this.unitType   = ptr.add(0x01).readU8();
            this.unitGUID   = ptr.add(0x02).readU32();
            this.x          = ptr.add(0x06).readU16();
            this.y          = ptr.add(0x08).readU16();
            this.bool       = ptr.add(0x01).readU8();
        }
    }
}
