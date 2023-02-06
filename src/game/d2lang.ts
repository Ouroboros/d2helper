import { D2Base } from './d2base';

export class D2Lang extends D2Base {
    GetLocaleText(index: number): string {
        const s = this.addrs.D2Lang.GetLocaleText(index);
        return s.isNull() ? '<None>' : s.readUtf16String()!;
    }
}