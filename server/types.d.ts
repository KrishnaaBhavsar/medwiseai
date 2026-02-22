// Enable default import for cors
declare module 'cors' {
    import { CorsOptions, CorsOptionsDelegate, CorsRequest } from 'cors';

    // This signature matches what `import cors from 'cors'` expects when treated as a default export 
    // but the underlying module is CommonJS `export =`.
    // Effectively we are telling TS: "Trust me, when I import default, I get this function."
    function cors(
        options?: CorsOptions | CorsOptionsDelegate | undefined
    ): (
        req: CorsRequest,
        res: {
            statusCode?: number | undefined;
            setHeader(key: string, value: string): any;
            end(): any;
        },
        next: (err?: any) => any
    ) => void;

    export = cors;
}
