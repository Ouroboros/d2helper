import * as d2types from './d2types';
import { D2Game } from './game';
import { D2ItemInvPage } from './types';

class StashPageInfo extends NativePointer {
    get page() {
        return this.readU32();
    }

    get flags() {
        return this.add(4).readU32();
    }
}

export class Stash {
    get currentPage() {
        const info = this.getPageInfo();
        return info ? info.page : 0;
    }

    getPlayerData() {
        const player = D2Game.D2Client.GetPlayerUnit();
        if (player.isNull())
            return null;

        const playerData = D2Game.D2Common.Unit.GetPlayerData(player);

        return playerData.isNull() ? null : playerData;
    }

    getPageInfo() {
        const playerData = this.getPlayerData();
        if (!playerData)
            return;

        return new StashPageInfo(playerData.add(0x174).readPointer());
    }

    findSlotsForItem(item: d2types.Unit) {
        return D2Game.D2Common.Inventory.findSlotsForItem(item, D2ItemInvPage.Stash);
    }

    putItemToPos(item: d2types.Unit, x: number, y: number) {
        D2Game.D2Client.itemToBuffer(item.ID, x, y, D2ItemInvPage.Stash);
    }

    prevPage() {
        D2Game.D2Client.addStat(0x19);
    }

    nextPage() {
        D2Game.D2Client.addStat(0x1A);
    }

    firstPage() {
        D2Game.D2Client.addStat(0x1F);
    }

    lastPage() {
        D2Game.D2Client.addStat(0x22);
    }

    gotoPage(n: number) {
        const d = n - this.currentPage;
        if (d == 0)
            return;

        if (n == 0)
            return this.firstPage();

        const c = Math.abs(d);
        const fn = (d > 0 ? this.nextPage : this.prevPage).bind(this);
        for (let i = 0; i != c; i++)
            fn();
    }
}