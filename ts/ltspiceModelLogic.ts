import { DEFAULT_MODELS, MODEL_TYPES } from "./ltspiceDefaultModels.js";
import * as d from "./ltspiceModelParser.js";
import { arraysEqual, parseLtspiceNumber } from "./Utils.js";

/** Specifies a group of files with extensions 'bjt, dio, jft, mos' */
export type i_modelDb = {
    /** Display name for the pack. */
    name: string,
    /** Pack location inside .data/models/ */
    location: string,
    /** Source of this pack, as URL or string. */
    source: string,
    /** Priority number of precedence this pack. */
    priority: number,
    /** Files to load inside ./data/models/{location} */
    files: string[],
    /** Each files contents, loaded. Keys are the elements of 'files' */
    fileData: { [key: string]: string }
};

/** Loads models from this app's ./data/models */
export async function getModelDb() {
    const modelLibs = await (await fetch('./data/models.json')).json() as i_modelDb[];
    if (!modelLibs) return [];

    for (const modelLib of modelLibs) {
        modelLib.fileData = {};
        for (const file of modelLib.files) {
            const fileContents = await (await fetch(`./data/models/${modelLib.location}/${file}`)).text();
            if (!fileContents) continue;
            modelLib.fileData[file] = fileContents;
        }
    }
    return modelLibs;
}

/** Specifies a parsed i_modelDb */
export type i_modelPack = {
    /** Display name of the pack. */
    displayName: string,
    /** Pack location inside ./data/models */
    name: string,
    /** Pack priority precedence number. */
    priority: number,
    /** Parsed model results. */
    data: i_preLtspiceParseResults[],
}

/** Specifies a single model directive parse result. */
export type i_preLtspiceParseResults = {
    /** Original .MODEL directive string. */
    line: string,
    /** Parsed .MODEL. */
    p: any,
    /** Parse error, if any. */
    err: string | null,
    /** File where the .MODEL came from.  */
    src: string
    /** Line number of the .MODEL inside the file (after preprocessing). */
    i: number,
}

/** Parses fileContents from getModelDb() and puts them in a list. */
export function parseModelDb(modelDbList: i_modelDb[]) {
    if (!(modelDbList instanceof Array && modelDbList.length > 1)) return [];

    const out = [] as i_modelPack[];
    for (const pack of modelDbList) {
        const oPack = {
            displayName: pack.name,
            name: pack.location,
            source: pack.source,
            priority: pack.priority,
            data: [],
        } as i_modelPack;

        let count = 0;
        for (const fdKey in pack.fileData) {
            const lines = d.preprocessString(pack.fileData[fdKey]).split('\n');
            for (let i = 0; i < lines.length; ++i) {
                const line = lines[i];
                if (line === '') continue;
                const parsedLine = d.parser.run(line);

                oPack.data.push({
                    line,
                    p: parsedLine.result,
                    err: parsedLine.error,
                    i,
                    src: fdKey,
                });
                ++count;
            }
        }
        out.push(oPack);
        console.log(`Loaded ${count} models from pack ${oPack.name}.`)
    }
    return out;
}

/** Fully defined ltspice model */
export type i_ltspiceModel = {
    /** Name of the model */
    modName: string,
    /** If this model is defined as an AKO alias. */
    isAko: boolean,
    /** Name of the ako base, if ako */
    akoBaseModel: string | null,
    /** Type of model (VDMOS, BJT, D...) */
    type: string | null,
    params: {
        [key: string]: ParamValue
    },
    /** Applies only to VDMOS. Defaults to nchan. */
    mosChannel?: 'nchan' | 'pchan',
    src: {
        /** Original pack name */
        pack: string,
        /** Priority of this pack */
        priority: number,
        /** File from which the model is defined. */
        file: string,
        /** Line index from which the model is defined (after trimming and comment removal). */
        lineIndex: number,
        /** Original line that defined the model.*/
        line: string,
        /** Error when parsing, if any. */
        err: string | null,
        /** Original line params */
        params: {
            [key: string]: any
        },
    }
}

export class ParamValue {
    type: 'null' | 'number' | 'string' = 'null';
    v: ReturnType<typeof parseLtspiceNumber> | { value: string } = null;

    constructor(str: any) {
        // find type of param
        const stdObj = {
            value: str,
            toString: function () { return this.value; },
            valueOf: function () { return this.value; }
        };
        if (str === null || str === undefined) {
            this.type = 'null';
            this.v = stdObj;
        } else if (typeof (str) === 'number') {
            this.type = 'number';
            this.v = parseLtspiceNumber(str.toString());
        }
        else if (typeof (str) === 'string') {
            // try parse as number
            const x = parseLtspiceNumber(str);
            if (x) {
                this.type = 'number';
                this.v = x
            } else {
                this.type = 'string';
                this.v = stdObj;
            }
        }
    }

    valueOf() {
        if (this.type === 'number') return this.v.value
    }
}

/** Joins and post-processes each given pack. */
export function joinDb(dbArray: i_modelPack[]) {
    if (!(dbArray instanceof Array && dbArray.length > 1)) return [];

    const o = [] as i_ltspiceModel[];
    for (const dB of dbArray) {
        for (const model of dB.data) {
            const p = model.p;
            const defaultModel = {
                modName: null,
                akoBaseModel: null,
                isAko: false,
                type: null,
                params: {},
            }

            // create model
            const thisModel = {
                ...defaultModel,
                ...p,
                src: {
                    pack: dB.name,
                    priority: dB.priority,
                    file: model.src,
                    lineIndex: model.i,
                    line: model.line,
                    err: model.err,
                },
            } as i_ltspiceModel;

            // fix some stuff on the model
            function runMethodIfExist(obj: any, exist: string, fn: string) {
                if (obj[exist] && typeof (obj[exist][fn]) === 'function')
                    obj[exist] = obj[exist][fn]();
            }
            runMethodIfExist(thisModel, 'type', 'toUpperCase');
            // runMethodIfExist(thisModel, 'modName', 'toUpperCase');
            // runMethodIfExist(thisModel, 'akoBaseModel', 'toUpperCase');

            const paramKeys = Object.keys(thisModel.params).map(x => x.toLowerCase());
            if (thisModel.type === 'VDMOS') {
                // find channel type
                let c: 'nchan' | 'pchan' = 'nchan'; // default
                if (paramKeys.includes('pchan')) c = 'pchan'
                thisModel.mosChannel = c;
            }

            // Process params
            thisModel.src.params = thisModel.params;
            const newParamEntries = [];
            const THIS_MODEL_PARAM_KEYS = Object.keys(DEFAULT_MODELS[thisModel.type] || {});
            const TMPK_LC = THIS_MODEL_PARAM_KEYS.map(x => x.toLowerCase());
            for (const entry of Object.entries(thisModel.src.params)) {
                const [key, val] = entry;
                let newEntry = [key, val];

                // Parse value (if a number)
                newEntry[1] = new ParamValue(val);

                // key proper capitalization
                const keyIdx = TMPK_LC.indexOf(key.toLowerCase());
                if (keyIdx !== -1)
                    newEntry[0] = THIS_MODEL_PARAM_KEYS[keyIdx];

                newParamEntries.push(newEntry);
            }
            thisModel.params = Object.fromEntries(newParamEntries);

            // push the model
            o.push(thisModel);
        }
    }
    return o.sort((a, b) => b.src.priority - a.src.priority);
}

/** Checks if two models are the same */
export function compareModels(a: i_ltspiceModel, b: i_ltspiceModel) {
    if (a === b) return true;
    const c = (a, b, x: string, map = (x) => x) => map(a[x]) === map(b[x]);
    const cp = (x: string, fn = (x) => x) => c(a, b, x, fn);
    const toUp = (x) => (x) ? x.toUpperCase() : x;
    return cp('modName', toUp) &&
        cp('isAko') &&
        cp('akoBaseModel', toUp) &&
        arraysEqual(Object.keys(a.params), Object.keys(b.params)) &&
        arraysEqual(Object.values(a.params), Object.values(b.params))
}

export function getModelsByType(modelList: i_ltspiceModel[]) {
    const o = {
        BJT: [] as i_ltspiceModel[],
        D: [] as i_ltspiceModel[],
        JFET: [] as i_ltspiceModel[],
        MOSFET: [] as i_ltspiceModel[],
    };
    for (const model of modelList) {
        for (const key in MODEL_TYPES) {
            if (MODEL_TYPES[key].includes(model.type)) {
                o[key].push(model);
            }
        }
    }
    return o;
}

export function getModelsDict(modelList: i_ltspiceModel[]) {
    const o = {};
    for (const model of modelList) {
        if (o[model.modName] === undefined)
            o[model.modName] = [];
        const currentModelStack = o[model.modName];

        let isRepeated = false;
        for (const validModel of currentModelStack) {
            isRepeated = compareModels(validModel, model);
            if (isRepeated) break;
        }
        if (!isRepeated) currentModelStack.push(model);
    }
    return o as {
        [key: string]: i_ltspiceModel[];
    };
}

export function getParameterAnalitics(modelList: i_ltspiceModel[]) {
    const o1 = {} as { [key: string]: ParamValue[] };

    for (const model of modelList) {
        const entries = Object.entries(model.params);

        for (const e of entries) {
            const [k, v] = e;
            if (o1[k] === undefined) { o1[k] = [v]; }
            else { o1[k].push(v); }
        }
    }

    const o2 = {};
    for (const key in o1) {
        const x = {
            min: Infinity,
            max: -Infinity,
            avg: 0,
            std: 0,
            count: 0,
            strSet: new Set(),
        }
        const nums = o1[key].filter(x => x.type === 'number').map(x => x.v.value) as number[];

        for (const n of nums) {
            if (x.min > n) x.min = n;
            if (x.max < n) x.max = n;
            x.avg += n;
            ++x.count;
        }
        x.avg /= x.count;

        for (const n of nums) {
            x.std += (n - x.avg) * (n - x.avg);
        }
        x.std = Math.sqrt(x.std / x.count);

        const etc = o1[key].filter(x => x.type !== 'number').map(x => x.v.value);
        for (const s of etc) {
            x.strSet.add(s);
            ++x.count;
        }

        o2[key] = x;
    }

    return o2;
}