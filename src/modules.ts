import * as path from "path";

const modules = Process.enumerateModules();

export const Modules = {
    KERNEL32    : Module.load('KERNEL32.dll'),
    USER32      : Module.load('USER32.dll'),
    ADVAPI32    : Module.load('ADVAPI32.dll'),
    ucrtbase    : Module.load('ucrtbase.dll'),
    Game        : modules[0],

    ExePath     : path.dirname(modules[0].path.split('\\').join('/')).split('/').join('\\'),
};

export const API = {
    crt: {
        fopen           : new NativeFunction(Modules.ucrtbase.getExportByName('fopen'), 'pointer', ['pointer', 'pointer'], 'mscdecl'),
        wfopen          : new NativeFunction(Modules.ucrtbase.getExportByName('_wfopen'), 'pointer', ['pointer', 'pointer'], 'mscdecl'),
        fread           : new NativeFunction(Modules.ucrtbase.getExportByName('fread'), 'size_t', ['pointer', 'size_t', 'size_t', 'pointer'], 'mscdecl'),
        fwrite          : new NativeFunction(Modules.ucrtbase.getExportByName('fwrite'), 'size_t', ['pointer', 'size_t', 'size_t', 'pointer'], 'mscdecl'),
        fclose          : new NativeFunction(Modules.ucrtbase.getExportByName('fclose'), 'void', ['pointer'], 'mscdecl'),
        _fseeki64       : new NativeFunction(Modules.ucrtbase.getExportByName('_fseeki64'), 'int32', ['pointer', 'int64', 'int32'], 'mscdecl'),
        fseek           : new NativeFunction(Modules.ucrtbase.getExportByName('fseek'), 'int32', ['pointer', 'int32', 'int32'], 'mscdecl'),
        _fileno         : new NativeFunction(Modules.ucrtbase.getExportByName('_fileno'), 'int32', ['pointer'], 'mscdecl'),
        _filelengthi64  : new NativeFunction(Modules.ucrtbase.getExportByName('_filelengthi64'), 'uint64', ['int32'], 'mscdecl'),
        strlen          : new NativeFunction(Modules.ucrtbase.getExportByName('strlen'), 'uint32', ['pointer'], 'mscdecl'),
        malloc          : new NativeFunction(Modules.ucrtbase.getExportByName('malloc'), 'pointer', ['uint32'], 'mscdecl'),
    },

    WIN32: {
        LoadLibraryW                : new NativeFunction(Modules.KERNEL32.getExportByName('LoadLibraryW'), 'pointer', ['pointer'], 'stdcall'),
        CreateFileW                 : new NativeFunction(Modules.KERNEL32.getExportByName('CreateFileW'), 'pointer', ['pointer', 'uint32', 'uint32', 'pointer', 'uint32', 'uint32', 'pointer'], 'stdcall'),
        GetFileAttributesA          : new NativeFunction(Modules.KERNEL32.getExportByName('GetFileAttributesA'), 'uint32', ['pointer'], 'stdcall'),
        Sleep                       : new NativeFunction(Modules.KERNEL32.getExportByName('Sleep'), 'void', ['uint32'], 'stdcall'),
        MultiByteToWideChar         : new NativeFunction(Modules.KERNEL32.getExportByName('MultiByteToWideChar'), 'int32', ['uint32', 'uint32', 'pointer', 'int32', 'pointer', 'int32'], 'stdcall'),
        WideCharToMultiByte         : new NativeFunction(Modules.KERNEL32.getExportByName('WideCharToMultiByte'), 'int32', ['uint32', 'uint32', 'pointer', 'int32', 'pointer', 'int32', 'pointer', 'pointer'], 'stdcall'),
        AddVectoredExceptionHandler : new NativeFunction(Modules.KERNEL32.getExportByName('AddVectoredExceptionHandler'), 'pointer', ['uint32', 'pointer'], 'stdcall'),
    },

    USER32: {
        // GetAsyncKeyState                : new NativeFunction(Modules.USER32.getExportByName('GetAsyncKeyState'), 'int16', ['int32'], 'stdcall'),
        // GetKeyState                     : new NativeFunction(Modules.USER32.getExportByName('GetKeyState'), 'int16', ['int32'], 'stdcall'),
        // GetSystemMetrics                : new NativeFunction(Modules.USER32.getExportByName('GetSystemMetrics'), 'int32', ['int32'], 'stdcall'),
        // SystemParametersInfoW           : new NativeFunction(Modules.USER32.getExportByName('SystemParametersInfoW'), 'uint32', ['uint32', 'uint32', 'pointer', 'uint32'], 'stdcall'),
        // SetWindowPos                    : new NativeFunction(Modules.USER32.getExportByName('SetWindowPos'), 'uint32', ['pointer', 'pointer', 'int32', 'int32', 'int32', 'int32', 'uint32'], 'stdcall'),
        PeekMessageA                : new NativeFunction(Modules.USER32.getExportByName('PeekMessageA'), 'int32', ['pointer', 'pointer', 'uint32', 'uint32', 'uint32']),
        GetClassNameW               : new NativeFunction(Modules.USER32.getExportByName('GetClassNameW'), 'int32', ['pointer', 'pointer', 'int32']),
    },

    ADVAPI32: {
        CheckTokenMembership        : new NativeFunction(Modules.ADVAPI32.getExportByName('CheckTokenMembership'), 'int32', ['pointer', 'pointer', 'pointer'], 'stdcall'),
        AddAccessDeniedAce          : new NativeFunction(Modules.ADVAPI32.getExportByName('AddAccessDeniedAce'), 'int32', ['pointer', 'uint32', 'uint32', 'pointer'], 'stdcall'),
    },
};
