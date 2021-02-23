import { DEFAULT_MODELS, DEFAULT_MODEL_PARAM_KEYS, DEFAULT_MODEL_PARAM_KEYS_LOWERCASE, i_defaultParamDefinition, MODEL_TYPES, tryParseDefaultParam } from "./ltspiceDefaultModels.js";
import * as d from "./ltspiceModelParser.js";
import { arraysEqual, caseUnsensitiveProperty, fromEntries, getStringHashCode, LtspiceNumber, numberToHSL, objectMap, parseLtspiceNumber, runMethodIfExist } from "./Utils.js";

/** Specifies a group of files with extensions 'bjt, dio, jft, mos' */
export type i_modelDb = {
    /** Display name for the pack. */
    name: string,
    /** Very short string to display on the table as the source library. */
    logo?: string,
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
    /** Logo of the pack to show at the table. */
    logo: {
        /** Name to show. Very short string. */
        name: string,
        /** Color, formatted as CSS HSL(). */
        color: string,
    }
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
export async function parseModelDb(
    modelDbList: i_modelDb[],
    progressCallback = (
        pack_i,
        pack_l,
        file_i,
        file_l,
        line_i,
        line_l,
        libStr,
        fileStr,
    ) => { }
) {
    if (!(modelDbList instanceof Array && modelDbList.length > 1)) return [];

    const out = [] as i_modelPack[];
    //(const pack of modelDbList)
    const packLen = modelDbList.length
    for (let packIdx = 0; packIdx < packLen; ++packIdx) {
        const pack = modelDbList[packIdx];
        let logoName = pack['logo'] || pack.name.slice(0, 2) + pack.name.slice(-1);
        let logoColor = numberToHSL(getStringHashCode(pack.name + pack.source + pack.location), .5, .6);
        const oPack = {
            displayName: pack.name,
            logo: { name: logoName, color: logoColor, },
            name: pack.location,
            source: pack.source,
            priority: pack.priority,
            data: [],
        } as i_modelPack;

        let count = 0;

        const fileDataKeys = Object.keys(pack.fileData);
        const fdeLen = fileDataKeys.length;
        // used to be (const fdKey in pack.fileData), updated to show progress. 
        for (let fdei = 0; fdei < fdeLen; ++fdei) {
            const fdKey = fileDataKeys[fdei];
            const lines = d.preprocessString(pack.fileData[fdKey]).split('\n');
            const linesLen = lines.length;
            const progressDivs = Math.min(500, Math.max(1, Math.round(linesLen / 3.5)))
            for (let i = 0; i < linesLen; ++i) {

                // Progress thing... 
                // makes actual process slower, 
                // but is better than .5s of unexplained lagging.
                if (progressCallback && (i % progressDivs === 0) || (i === linesLen - 1)) {
                    await progressCallback(
                        packIdx,
                        packLen,
                        fdei,
                        fdeLen,
                        i + 1,
                        linesLen,
                        pack.location,
                        fdKey,
                    );
                }

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
    pack: i_modelPack,
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

        const params = LtspiceModel.parseParams(o.params, this.type);

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
            pack: null,
            priority: 10,
            file: '',
            lineIndex: 0,
            line: '', // TODO: Change to parseModelToLine
            err: null,
            params: obj.params || objectMap(params, x => x.toString()),
        } as i_modelSrc;

    }

    /** Maps and corrects a dict  */
    static parseParams(obj: { [key: string]: any }, modelType: string = ''): { [key: string]: ParamValue } {
        const newParamEntries = [],
            TMPK = DEFAULT_MODEL_PARAM_KEYS[modelType] || [],
            TMPK_LC = DEFAULT_MODEL_PARAM_KEYS_LOWERCASE[modelType] || [];
        var keyIdx, newEntry;

        for (var entry of Object.entries(obj)) {
            var [key, val] = entry;
            newEntry = [key, new ParamValue(val)];

            // key proper capitalization
            keyIdx = TMPK_LC.indexOf(key.toLowerCase());
            if (keyIdx !== -1)
                newEntry[0] = TMPK[keyIdx];

            newParamEntries.push(newEntry);
        }

        return fromEntries(newParamEntries);
    }

    /**
     * Tries to get parameter 'param' of the given model by searching:
     *   1. Inside the given model.
     *   2. Inside the AKO alias model (if its AKO)
     *   3. Inside DEFAULT_MODELS
     */
    static getParam(
        model: LtspiceModel,
        param: string,
        modelDbByName: { [k: string]: LtspiceModel } | { [k: string]: LtspiceModel[] } = null,
        lookAtDefaultModels = true,
        _lastSearch = null
    ): {
        v: ParamValue,
        src: 'model' | 'ako' | 'default' | 'notFound',
        desc: string,
    } {
        const console = {
            log: (...args) => { },
        }
        let DEF_MODEL = DEFAULT_MODELS[model.type] as i_defaultParamDefinition;
        let desc = caseUnsensitiveProperty(DEF_MODEL, param)?.description || '';

        // 1. Inside given param
        let a = caseUnsensitiveProperty(model.params, param);
        if (a !== undefined) {
            console.log('Found on model');
            return { v: a, src: 'model', desc };
        }

        // 2. Inside original AKO alias.
        if (model.isAko && model.akoBaseModel) {
            console.log('Model is AKO ' + model.akoBaseModel)
            if (modelDbByName && modelDbByName[model.akoBaseModel]) {
                // Do not look at default model here!
                let akoModelElem = modelDbByName[model.akoBaseModel];
                let akoModel = (akoModelElem instanceof Array) ? akoModelElem[0] : akoModelElem;
                let b = LtspiceModel.getParam(akoModel, param, modelDbByName, false);
                if (b !== undefined) {
                    console.log('Found on AKO ' + model.akoBaseModel);
                    return { ...b, src: 'ako' };
                }
            } else {
                console.log('AKO model ' + model.akoBaseModel + ' could not be found.')
            }
        }

        // 3. Inside default (if allowed)
        if (lookAtDefaultModels) {
            let d = caseUnsensitiveProperty(DEF_MODEL, param);
            if (d !== undefined) {
                let e = tryParseDefaultParam(d);

                // Param is reference to another param.
                // _lastSearch is to avoid potential recursion
                if (typeof (e) === 'string' && _lastSearch !== e) {
                    console.log('Searching as parameter ' + e);
                    return { ...LtspiceModel.getParam(model, e, modelDbByName, lookAtDefaultModels, e), src: 'default' };
                }

                if (e !== undefined) {
                    console.log('Found on DEFAULT_MODEL');
                    return { v: new ParamValue(e), src: 'default', desc };// return a number/string;
                }
            }
        }
        console.log('Not found!');
        return { v: undefined, src: 'notFound', desc };
    }

    getParam(e: string, modelDbByName?: { [k: string]: LtspiceModel } | { [k: string]: LtspiceModel[] }, lookAtDefaultModels: boolean = true) {
        return LtspiceModel.getParam(this, e, modelDbByName, lookAtDefaultModels);
    }

    getType(modelDbByName?: { [k: string]: LtspiceModel }) {
        if (MODEL_TYPES.BJT.includes(this.type) ||
            MODEL_TYPES.JFET.includes(this.type)) {
            return this.type;
        } else if (MODEL_TYPES.MOSFET.includes(this.type)) {
            return this.mosChannel;
        } else if (this.type === 'D') {
            return this.getParam('type', modelDbByName).v.toString()
        }
    }

    getModelDirective() {
        let out = `.model ${this.modName} `;
        if (this.isAko) out += `ako:${this.akoBaseModel} `
        out += this.type;
        if (this.params) {
            let p = [];
            for (let param in this.params) {
                let pval = this.params[param];
                if (pval.v) {
                    let val = (pval.type === 'number') ? pval.v.toString(true, true) : pval.v.toString();
                    p.push(param + '=' + val);
                } else {
                    p.push(param);
                }
            }
            out += `(${p.join(' ')})`
        }
        return out;
    }
}

export class ParamValue {
    type: 'null' | 'number' | 'string' = 'null';
    v: LtspiceNumber | { value: string } = null;

    constructor(str: any) {
        // find type of param
        if (str === null || str === undefined) {
            this.type = 'null';
            this.v = {
                value: str,
                toString: function () { return this.value; },
                valueOf: function () { return this.value; }
            };;
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
                this.v = {
                    value: str,
                    toString: function () { return this.value; },
                    valueOf: function () { return this.value; }
                };;
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

            // create model
            const src = {
                pack: dB,
                priority: dB.priority,
                file: model.src,
                lineIndex: model.i,
                line: model.line,
                err: model.err,
            } as i_modelSrc;

            // fix some stuff on the model
            const m = new LtspiceModel(model.p, src);

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
    const allModelParams = {} as { [key: string]: ParamValue[] };

    for (const model of modelList) {
        const entries = Object.entries(model.params);

        for (const e of entries) {
            const [k, v] = e;
            if (allModelParams[k] === undefined) { allModelParams[k] = [v]; }
            else { allModelParams[k].push(v); }
        }
    }

    const allParamStats = {} as {
        [key: string]: {
            min: number,
            max: number,
            avg: number,
            std: number,
            count: number,
            strSet: Set<string>
        }
    };

    for (const paramKey in allModelParams) {
        const x = {
            min: Infinity,
            max: -Infinity,
            avg: 0,
            std: 0,
            count: 0,
            strSet: new Set<string>(),
        }

        // Get number parameters
        const nums = allModelParams[paramKey]
            .filter(x => x.type === 'number')
            .map(x => x.v.value) as number[];

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

        // Get all non-number parameters
        const etc = allModelParams[paramKey]
            .filter(x => x.type !== 'number')
            .map(x => x.v.value) as string[];

        for (const s of etc) {
            x.strSet.add(s);
            ++x.count;
        }

        allParamStats[paramKey] = x;
    }

    return allParamStats;
}

