import * as d2types from '../d2types';
import * as utils from '../../utils';
import * as json5 from 'json5';
import { Stash } from '../stash';
import { API } from '../../modules';
import { D2Game } from '../game';
import { D2ItemInvPage, D2UIVars, D2UnitItemMode } from '../types';
import { AbortController, Task } from '../../task';

interface IDropRuleBase {
    type: string;
}

interface IDropRuleProperty extends IDropRuleBase {
    regex   : boolean;
    property: string;
}

interface IDropCommand {
    key     : string;
    name    : string;
    id      : number | number[];
    exclude : boolean;
    quality : number[];
    rules   : IDropRuleBase[];
}

interface IInvSortCommand {
    id          : number;
    quality     : number[];
    properties  : string[];
    invPage     : string;
    page        : number;
}

interface ICommands {
    drop    : IDropCommand[];
    invsort : IInvSortCommand[];
}

export function install() {
    D2Game.D2Client.registerCommand('drop', new DropCmdHandler());
    D2Game.D2Client.registerCommand('invsort', new InvSortCmdHandler());

    const key = API.VirtualKeyCode.VK_ESCAPE;
    D2Game.D2Client.onKeyDown(function(vk: number) {
        switch (vk) {
            case key:
                // D2Game.D2Client.PrintGameString('cmd canceled');
                CmdHandler.abortCurrentTask();
                break;
        }
    });
}

class CmdHandler {
    static currentTask: Task<boolean> | null = null;
    private controller = new AbortController;

    async loadConfig(): Promise<ICommands | null> {
        const cmds = utils.readFileContent('commands.json5');
        if (!cmds) {
            await this.printGameString('读取 commands.json5 失败');
            return null;
        }

        const cfg = json5.parse(Buffer.from(cmds).toString('utf8'));
        if (!cfg) {
            await this.printGameString('解析 commands.json5 失败');
            return null;
        }

        return cfg;
    }

    async printGameString(s: string) {
        utils.log(s);
        return this.runOnMainThread(() => D2Game.D2Client.PrintGameString(s))
    }

    static abortCurrentTask() {
        utils.log(`abortCurrentTask: ${CmdHandler.currentTask}`);
        CmdHandler.currentTask?.abort();
        CmdHandler.currentTask = null;
    }

    async handleCommand(args: string[]) {
        if (CmdHandler.currentTask) {
            utils.log(`commandRunning`);
            return false;
        }

        CmdHandler.currentTask = new Task<boolean>(async (resolve, reject, onAbort) => {
            try {
                onAbort(() => {
                    utils.log('onAbort');
                    reject();
                    D2Game.D2Client.scheduleOnMainThread(() => D2Game.D2Client.PrintGameString('cmd canceled'));
                });

                await this.printGameString(`cmd start: $$0${args}`)
                const ret = await this.onCommand(args.slice(1));
                await this.printGameString(`cmd done: $$0${args}`);
                resolve(ret);

            } catch (error: any) {
                utils.log(`catch: ${error.stack}`);
                reject(error);

            } finally {
                utils.log(`cmd done 2: ${args}`);
                CmdHandler.currentTask = null;
            }
        }, this.controller, 'cmd task');

        return CmdHandler.currentTask;
    }

    async onCommand(args: string[]) {
        throw new Error(`not implemented: ${args}`);
        return false;
    }

    async delay(ms: number) {
        await utils.delay(ms, this.controller);
    }

    async waitUntil(cb: () => Promise<boolean>) {
        await utils.waitUntil(cb, 50, this.controller);
    }

    async runOnMainThread<T>(fn: () => T): Promise<T> {
        return D2Game.D2Client.scheduleOnMainThreadAsync(fn, this.controller);
    }

    async pickupBufferItem(unitId: number) {
        while ((await this.getCursorItem()).isNull()) {
            await this.runOnMainThread(() => D2Game.D2Client.pickupBufferItem(unitId));
            await this.delay(50);
        }
        // await this.runOnMainThread(() => D2Game.D2Client.pickupBufferItem(unitId));
        // await this.waitUntil(async () => !(await this.getCursorItem()).isNull());
    }

    async itemToBuffer(unitId: number, x: number, y: number, page: D2ItemInvPage) {
        while (!(await this.getCursorItem()).isNull()) {
            await this.runOnMainThread(() => D2Game.D2Client.itemToBuffer(unitId, x, y, page));
            await this.delay(50);
        }
        // await this.runOnMainThread(() => D2Game.D2Client.itemToBuffer(unitId, x, y, page));
        // await this.waitUntil(async () => (await this.getCursorItem()).isNull());
    }

    async dropItem(unitId: number) {
        return this.runOnMainThread(() => D2Game.D2Client.dropItem(unitId));
    }

    async getCursorItem() {
        return this.runOnMainThread(() => D2Game.D2Common.Inventory.GetCursorItem(D2Game.D2Client.GetPlayerUnit().Inventory));
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

class DropCmdHandler extends CmdHandler {
    usage() {
        return '.drop <key> <count>';
    }

    async onCommand(args: string[]) {
        if (!D2Game.D2Client.GetUIVars(D2UIVars.Cube)) {
            await this.printGameString('$$1Error: $$0 Open your cube');
            return false;
        }

        if (args.length == 1)
            args.push('0');

        const params = this.parseArgs('sd', args);
        if (!params)
            return false;

        const cfg = await this.loadConfig()
        if (!cfg)
            return false;

        const drop = cfg!.drop;
        if (drop?.length == 0)
            return false;

        const key: string = params[0];
        let count: number = params[1];

        if (count <= 0)
            count = 100000;

        const dropCmds = drop.filter(d => d.key == key).map((cmd) => {
            if (!Array.isArray(cmd.id))
                cmd.id = [cmd.id];

            return cmd;
        });

        const items: d2types.Unit[] = [];

        await this.runOnMainThread(() => {
            D2Game.D2Common.enumInventoryItems((item: d2types.Unit) => {
                if (items.length == count)
                    return true;

                if (item.Mode != D2UnitItemMode.InvOrCube)
                    return false;

                if (D2Game.D2Common.Inventory.GetItemInvPage(item) != D2ItemInvPage.Cube)
                    return false;

                const itemId = this.getItemMaphackID(item);

                for (const entry of dropCmds) {
                    if (!(entry.id as number[]).includes(itemId))
                        continue;

                    if (!entry.quality.includes(D2Game.D2Common.Item.GetItemQuality(item)))
                        continue;

                    if (this.matchRules(entry.rules, item) && entry.exclude) {
                        continue;
                    }

                    items.push(item);
                }

                return false;
            })
        });

        utils.log(`${items.length} items`);

        for (const i of items) {
            const unitId = i.ID;

            await this.pickupBufferItem(unitId);
            while ((await this.getCursorItem()).isNull()) {
                await this.delay(50);
            }

            await this.dropItem(unitId);
            while (!(await this.getCursorItem()).isNull()) {
                await this.delay(50);
            }
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
                        if (re.test(property))
                            return true;

                    } else if (property.indexOf(r.property) != -1) {
                        return true;
                    }

                    break;
                }
            }
        }

        return false;
    }
}

class InvSortCmdHandler extends CmdHandler {
    usage() {
        return '.invsort';
    }

    async onCommand(args: string[]) {
        if (!D2Game.D2Client.GetUIVars(D2UIVars.Cube) && !D2Game.D2Client.GetUIVars(D2UIVars.Stash)) {
            await this.printGameString('$$1Error: $$0 Open your cube or stash');
            return false;
        }

        const cfg = await this.loadConfig()
        if (!cfg)
            return false;

        const invsort = cfg.invsort;
        if (invsort?.length == 0)
            return false;

        const items = Array.from(Array(20), () => new Array<d2types.Unit>);
        let itemCount = 0;

        await this.runOnMainThread(() => {
            D2Game.D2Common.enumInventoryItems((item: d2types.Unit) => {
                if (item.Mode != D2UnitItemMode.InvOrCube)
                    return false;

                switch (D2Game.D2Common.Inventory.GetItemInvPage(item)) {
                    case D2ItemInvPage.Cube:
                        break;

                    default:
                        return false;
                }

                const itemId = this.getItemMaphackID(item);

                for (const entry of invsort) {
                    if (entry.id != itemId)
                        continue;

                    if (entry.quality?.length && !entry.quality.includes(D2Game.D2Common.Item.GetItemQuality(item)))
                        continue;

                    if (entry.properties?.length) {
                        const property = this.getItemProperty(item);
                        if (!this.matchProperty(entry, property)) {
                            continue;
                        }
                    }

                    // utils.log(`found: loc:${entry.location} page:${entry.page} \n******************\n${property.split('\n').reverse().join('\n')}\n******************\n`);
                    items[entry.page - 1].push(item);
                    itemCount++;
                    break;
                }

                return false;
            })
        });

        utils.log(`${itemCount} items`);

        if (itemCount == 0)
            return true;

        const stash = new Stash;
        const currentPage = await this.runOnMainThread(() => stash.currentPage);

        await this.runOnMainThread(() => stash.firstPage());
        await this.waitUntil(async () => this.runOnMainThread(() => stash.currentPage == 0));

        for (let page = 0; page != items.length; page++) {
            utils.log(`------------ page: ${page + 1} ------------`);

            if (items[page].length && page != 0) {
                await this.runOnMainThread(() => stash.gotoPage(page));
                await this.waitUntil(async () => this.runOnMainThread(() => stash.currentPage == page));
            }

            for (const item of items[page]) {
                utils.log(`  itemId:${item.ID}`)

                const slot = await this.runOnMainThread(() => stash.findSlotsForItem(item));
                if (!slot) {
                    await this.printGameString('stash is full');
                    break;
                }

                const unitId = item.ID;

                // utils.log('pickupBufferItem');
                await this.pickupBufferItem(unitId);
                // utils.log('itemToBuffer');
                await this.itemToBuffer(unitId, slot!.x, slot!.y, D2ItemInvPage.Stash);
            }

            utils.log(`************ page: ${page + 1} ************`);
        }

        await this.runOnMainThread(() => stash.gotoPage(currentPage));

        return true;
    }

    matchProperty(entry: IInvSortCommand, property: string) {
        for (const p of entry.properties)
            if (!property.includes(p))
                return false;

        return true;
    }
}
