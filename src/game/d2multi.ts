import { D2Base } from './d2base';

export class D2Multi extends D2Base {
    BNCreateGameTabOnClick(): boolean {
        if (this.addrs.D2Multi.WaitForBNReadyStartTime.readU32() != 0)
            return false;

        if (this.addrs.D2Multi.CreateGameTabControl.readPointer().isNull())
            return false;

        this.addrs.D2Multi.BNCreateGameTabOnClick(NULL);
        return true;
    }

    BNCreateGameBtnOnClick() {
        return this.addrs.D2Multi.BNCreateGameBtnOnClick(NULL);
    }
}