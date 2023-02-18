import path from 'path';
import * as utils from '../../utils';
import { API } from '../../modules';
import { Interceptor2 } from '../../utils';
import { D2Game } from '../game';

export class InternalPatch {
    install() {
        // this.dumpMPQFiles();
        this.bypassAdminCheck();
    }

    dumpMPQFiles() {
        const MPQLoadFile = Interceptor2.jmp(
            D2Game.getInstance().addrs!.Storm.LoadFile,
            function(fileInfo: NativePointer, buffer: NativePointer, bufferSize: number, outputSize: NativePointer, arg5: number, arg6: number, arg7: number): number {
                if (outputSize.isNull()) {
                    outputSize = Memory.alloc(4);
                }

                const ok = MPQLoadFile(fileInfo, buffer, bufferSize, outputSize, arg5, arg6, arg7);
                if (!ok)
                    return ok;

                // return ok;

                const filename = fileInfo.add(8).readAnsiString()!;

                if (filename == '(attributes)')
                    return ok;

                if (!filename.toLocaleLowerCase().startsWith('data\\'))
                    return ok;

                if (!['.bin', '.tbl', '.txt'].includes(path.extname(filename))) {
                    return ok;
                }

                utils.log(`load ${filename}`);

                const dumpPath = path.join('MPQDumped', filename).replaceAll('\\', '/');

                // utils.log(`dumpPath: ${dumpPath}`);

                const dirs = [];

                for (let dir = path.dirname(dumpPath); dir != '.'; dir = path.dirname(dir)) {
                    dirs.push(dir);
                }

                for (const dir of dirs.reverse()) {
                    // utils.log(`create dir: ${dir}`);
                    API.WIN32.CreateDirectoryW(utils.UTF16(dir), NULL);
                }

                const fp = API.crt.wfopen(utils.UTF16(dumpPath.replaceAll('/', '\\')), utils.UTF16('wb'));
                if (!fp.isNull()) {
                    API.crt.fwrite(buffer, outputSize.readU32(), 1, fp);
                    API.crt.fclose(fp);
                }

                return ok;
            },
            'uint32', ['pointer', 'pointer', 'uint32', 'pointer', 'uint32', 'uint32', 'uint32'], 'stdcall',
        );
    }

    bypassAdminCheck() {
        const CheckTokenMembership = Interceptor2.jmp(
            API.ADVAPI32.CheckTokenMembership,
            (tokenHandle: NativePointer, sidToCheck: NativePointer, isMember: NativePointer): number => {
                const success = CheckTokenMembership(tokenHandle, sidToCheck, isMember);

                do {
                    if (success == 0)
                        break;

                    if (
                            sidToCheck.add(0x01).readU8() != 2 ||           // SubAuthorityCount
                            sidToCheck.add(0x02).readU32() != 0 ||          // SECURITY_NT_AUTHORITY
                            sidToCheck.add(0x06).readU16() != 0x500 ||      // SECURITY_NT_AUTHORITY
                            sidToCheck.add(0x08).readU16() != 0x20 ||       // SECURITY_BUILTIN_DOMAIN_RID
                            sidToCheck.add(0x0C).readU16() != 0x220         // DOMAIN_ALIAS_RID_ADMINS
                        )
                        break;

                    isMember.writeU32(1);

                } while (0);

                return success;
            },
            'int32', ['pointer', 'pointer', 'pointer'], 'stdcall',
        );
    }
}
