import { DEFAULT_MODELS, i_defaultParamDefinition, MODEL_TYPES, tryParseDefaultParam } from "./ltspiceDefaultModels.js";
import * as d from "./ltspiceModelParser.js";
import { arraysEqual, caseUnsensitiveProperty, LtspiceNumber, parseLtspiceNumber, runMethodIfExist } from "./Utils.js";

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

type i_modelSrc = {
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
/** Fully defined ltspice model */
export class LtspiceModel {
    /** Name of the model */
    modName: string;
    /** If this model is defined as an AKO alias. */
    isAko: boolean = false;
    /** Name of the ako base, if ako */
    akoBaseModel: string | null;
    /** Type of model (VDMOS, BJT, D...) */
    type: string | null;
    params: {
        [key: string]: ParamValue
    };
    /** Applies only to VDMOS. Defaults to nchan. */
    mosChannel?: 'nchan' | 'pchan';
    /** Original source of this model */
    src: i_modelSrc;

    constructor(
        obj: {
            modName: string,
            type: string,
            isAko?: boolean,
            akoBaseModel?: string | null,
            params?: { [k: string]: any },
        },
        src?: i_modelSrc
    ) {
        // Default model params
        const o = {
            modName: '',
            type: 'D',
            isAko: false,
            akoBaseModel: null,
            params: {},
            ...obj
        }
        this.modName = o.modName;
        this.type = o.type.toUpperCase();
        this.isAko = o.isAko;
        this.akoBaseModel = o.akoBaseModel;

        const params = LtspiceModel.parseParams(o.params);

        this.params = params;

        const paramKeys = Object.keys(params).map(x => x.toLowerCase());
        if (obj.type === 'VDMOS') {
            // find channel type
            let c: 'nchan' | 'pchan' = 'nchan'; // default
            if (paramKeys.includes('pchan')) c = 'pchan'
            this.mosChannel = c;
        }
        if (obj.type === 'D') {
            // TODO: fix diode type formatting
        }

        this.src = src || {
            pack: 'nopack',
            priority: 10,
            file: '',
            lineIndex: 0,
            line: '', // TODO: Change to parseModelToLine
            err: null,
            params: obj.params || Object.fromEntries(
                Object.entries(params)
                    .map(x => [x[0], x[1].toString()])
            )
        } as i_modelSrc;

    }

    /** Maps and corrects a dict  */
    static parseParams(obj: { [key: string]: any }, modelType: string = ''): { [key: string]: ParamValue } {
        const newParamEntries = [];
        const THIS_MODEL_PARAM_KEYS = Object.keys(DEFAULT_MODELS[modelType] || {});
        const TMPK_LC = THIS_MODEL_PARAM_KEYS.map(x => x.toLowerCase());

        for (const entry of Object.entries(obj)) {
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

        return Object.fromEntries(newParamEntries);
    }

    getParam(e: string, modelDbByName: { [k: string]: LtspiceModel }, lookAtDefaultModels: boolean = true) {
        return getParam(this, e, modelDbByName, lookAtDefaultModels, e);
    }
}

export class ParamValue {
    type: 'null' | 'number' | 'string' = 'null';
    v: LtspiceNumber | { value: string } = null;

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
        } else if (str instanceof LtspiceNumber) {
            this.type = 'number';
            this.v = str;
        }
    }

    valueOf() {
        if (this.type === 'number') return this.v.value;
        else return this.v;
    }

    toString() {
        if (this.type !== 'null') return this.v.toString();
        else return '';
    }
}

/** Joins and post-processes each given pack. */
export function joinDb(dbArray: i_modelPack[]) {
    if (!(dbArray instanceof Array && dbArray.length > 1)) return [];

    const o = [] as LtspiceModel[];
    for (const dB of dbArray) {
        for (const model of dB.data) {
            const p = model.p;

            // create model
            const thisModel = {
                ...p,

            } as i_ltspiceModel;
            const src = {
                pack: dB.name,
                priority: dB.priority,
                file: model.src,
                lineIndex: model.i,
                line: model.line,
                err: model.err,
            } as i_modelSrc;

            // fix some stuff on the model
            const m = new LtspiceModel({ ...p }, src);

            // push the model
            o.push(m);
        }
    }
    return o.sort((a, b) => b.src.priority - a.src.priority);
}

/** Checks if two models are the same */
export function compareModels(a: LtspiceModel, b: LtspiceModel) {
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

export function getModelsByType(modelList: LtspiceModel[]) {
    const o = {
        BJT: [] as LtspiceModel[],
        D: [] as LtspiceModel[],
        JFET: [] as LtspiceModel[],
        MOSFET: [] as LtspiceModel[],
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

export function getModelsDict(modelList: LtspiceModel[]) {
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
        [key: string]: LtspiceModel[];
    };
}

export function getParameterAnalitics(modelList: LtspiceModel[]) {
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


/**
 * Tries to get parameter 'param' of the given model by searching:
 *   1. Inside the given model.
 *   2. Inside the AKO alias model (if its AKO)
 *   3. Inside DEFAULT_MODELS
 */
export function getParam(model: LtspiceModel, param: string, modelDbByName: { [k: string]: LtspiceModel } = null, lookAtDefaultModels = true, _lastSearch = null) {
    const { params, type, isAko, akoBaseModel } = model;

    // 1. Inside given param
    let a = caseUnsensitiveProperty(model.params, param);
    if (a !== undefined) {
        console.log('Found on model');
        return a;
    }

    // 2. Inside original AKO alias.
    if (isAko && akoBaseModel && modelDbByName && modelDbByName[akoBaseModel]) {
        // Do not look at default model here!
        let b = getParam(modelDbByName[akoBaseModel], param, modelDbByName, false);
        if (b !== undefined) {
            console.log('Found on AKO ' + akoBaseModel);
            return (b as ParamValue);
        }
    }

    // 3. Inside default (if allowed)
    if (lookAtDefaultModels) {
        let c = DEFAULT_MODELS[type] as i_defaultParamDefinition;
        let d = caseUnsensitiveProperty(c, param);
        if (d !== undefined) {
            let e = tryParseDefaultParam(d);

            // Param is reference to another param.
            // _lastSearch is to avoid potential recursion
            if (typeof (e) === 'string' && _lastSearch !== e) {
                console.log('Searching as parameter ' + e);
                return getParam(model, e, modelDbByName, lookAtDefaultModels, e);
            }

            if (e !== undefined) {
                console.log('Found on DEFAULT_MODEL');
                return new ParamValue(e)// return a number/string;
            }
        }
    }
    console.log('Not found!');
    return undefined;
}