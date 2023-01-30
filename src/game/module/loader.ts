// import { BotAutoKC } from './bot_kc';
import { BotAutoKC } from './bot_kc_v2';
import * as cmd from './cmd';

export function loadModules() {
    new BotAutoKC().install();
    cmd.install();
}
