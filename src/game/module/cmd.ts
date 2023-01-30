import * as d2types from '../d2types';
import * as utils from '../../utils';
import * as json5 from 'json5';
import { API } from '../../modules';
import { D2Game } from '../game';
import { D2ItemLocation, D2UnitItemMode } from '../types';

interface IDropRuleBase {
    type: string;
}

interface IDropRuleProperty extends IDropRuleBase {
    exclude : boolean;
    regex   : boolean;
    property: string;
}

interface IDropCommand {
    key     : string;
    name    : string;
    id      : number;
    quality : number[];
    rules   : IDropRuleBase[];
}

interface ICommands {
    drop: IDropCommand[];
}

export function install() {
    D2Game.D2Client.registerCommand('drop', new DropCmdHandler());

    const VK_ESC = API.VirtualKeyCode.VK_ESCAPE;
    D2Game.D2Client.onKeyDown(function(vk: number) {
        switch (vk) {
            case VK_ESC:
                CmdHandler._canceled = true;
                D2Game.D2Client.PrintGameString('cmd canceled');
                break;
        }
    });
}

class CmdHandler {
    static _canceled = false;

    get canceled() {
        return CmdHandler._canceled;
    }

    set canceled(b: boolean) {
        CmdHandler._canceled = b;
    }

    loadConfig(): ICommands | null {
        const cmds = utils.readFileContent('commands.json5');
        if (!cmds)
            return null;

        const cfg = json5.parse(Buffer.from(cmds).toString('utf8'));
        if (!cfg)
            return null;

        // utils.log(JSON.stringify(cfg, undefined, '  '));

        return cfg;
    }

    async handleCommand(args: string[]) {
        this.canceled = false;
        return this.onCommand(args);
    }

    async onCommand(args: string[]) {
        throw new Error('not implemented');
        return false;
    }

    async runOnMainThread<T>(fn: () => T): Promise<T> {
        return D2Game.D2Client.scheduleOnMainThreadAsync(fn);
    }

    usage() {
        return '<None>';
    }

    printUsage() {
        D2Game.D2Client.PrintGameString('usage: ' + this.usage());
    }

    parseArgs(fmt: string, args: any[]): any {
        const ret = function() {
            if (fmt.length != args.length) {
                return null;
            }

            for (let i = 0; i != fmt.length; i++) {
                switch (fmt[i]) {
                    case 'd':
                        if (isNaN(Number(args[i]))) {
                            return null;
                        }
                        args[i] = Number(args[i]);
                        break;

                    case 's':
                        break;

                    default:
                        return null;
                }
            }

            return args;
        }();

        if (!ret)
            this.printUsage();

        return ret;
    }

    getItemMaphackID(item: d2types.Unit): number {
        return D2Game.getInstance().getItemMaphackID(item);
    }
}

class DropCmdHandler extends CmdHandler {
    usage() {
        return '.drop <key> <count>';
    }

    async getCursorItem() {
        return await this.runOnMainThread(() => D2Game.D2Common.GetCursorItem(D2Game.D2Client.GetPlayerUnit().Inventory));
    }

    async onCommand(args: string[]) {
        if (args.length == 1)
            args.push('0');

        const params = this.parseArgs('sd', args);
        if (!params)
            return false;

        const cfg = this.loadConfig()
        if (!cfg)
            return false;

        const drop = cfg.drop;
        if (drop.length == 0)
            return false;

        const key: string = params[0];
        let count: number = params[1];

        if (count <= 0)
            count = 100000;

        const entries = drop.filter(d => d.key == key);
        const items: d2types.Unit[] = [];

        await this.runOnMainThread(() => {
            D2Game.D2Common.enumInventoryItems((item: d2types.Unit) => {
                if (items.length == count)
                    return true;

                if (item.Mode != D2UnitItemMode.InvOrCube)
                    return false;

                if (D2Game.D2Common.InventoryGetItemLocation(item) != D2ItemLocation.Cube)
                    return false;

                const itemId = this.getItemMaphackID(item);

                for (const entry of entries) {
                    if (entry.id != itemId)
                        continue;

                    if (entry.quality.indexOf(D2Game.D2Common.GetItemQuality(item)) == -1)
                        continue;

                    if (!this.matchRules(entry.rules, item)) {
                        continue;
                    }

                    items.push(item);
                }

                return false;
            })
        });

        utils.log(`items: ${items.length}`);

        for (const i of items) {
            if (this.canceled)
                break;

            const unitId = i.ID;

            await this.runOnMainThread(() => D2Game.D2Client.pickupBufferItem(unitId));
            while ((await this.getCursorItem()).isNull())
                await utils.delay(50);

            await this.runOnMainThread(() => D2Game.D2Client.dropItem(unitId));
            while (!(await this.getCursorItem()).isNull())
                await utils.delay(50);
        }

        return true;
    }

    matchRules(rules: IDropRuleBase[], item: d2types.Unit): boolean {
        const property = this.getItemProperty(item);

        for (const rule of rules) {
            switch (rule.type) {
                case 'property':
                {
                    const r = rule as IDropRuleProperty;

                    if (r.regex) {
                        const re = new RegExp(r.property, 'm');
                        if (re.test(property) && r.exclude)
                            return false;

                    } else if (property.indexOf(r.property) != -1) {
                        if (r.exclude)
                            return false;
                    }

                    break;
                }
            }
        }

        return true;
    }

    getItemProperty(item: d2types.Unit): string {
        const duck = D2Game.getInstance().getD2Duck()!
        const info = Memory.alloc(0x2C);
        const player = D2Game.D2Client.GetPlayerUnit();

        info.writePointer(player.Inventory);
        info.add(0x04).writePointer(player);
        info.add(0x08).writePointer(player);
        info.add(0x0C).writePointer(player);
        info.add(0x10).writePointer(item);
        info.add(0x14).writeU32(0xE);
        info.add(0x18).writeU32(1);

        const bufsize = 0x800;
        const buf = Memory.alloc(bufsize * 2);

        duck.ItemText.FormatItemProperties(info, buf, bufsize, 0, 0);

        return buf.readUtf16String()!;
    }
}
