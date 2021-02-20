var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { DEFAULT_MODELS, MODEL_TYPES, tryParseDefaultParam } from "./ltspiceDefaultModels.js";
import * as d from "./ltspiceModelParser.js";
import { arraysEqual, caseUnsensitiveProperty, LtspiceNumber, parseLtspiceNumber } from "./Utils.js";
/** Loads models from this app's ./data/models */
export function getModelDb() {
    return __awaiter(this, void 0, void 0, function* () {
        const modelLibs = yield (yield fetch('./data/models.json')).json();
        if (!modelLibs)
            return [];
        for (const modelLib of modelLibs) {
            modelLib.fileData = {};
            for (const file of modelLib.files) {
                const fileContents = yield (yield fetch(`./data/models/${modelLib.location}/${file}`)).text();
                if (!fileContents)
                    continue;
                modelLib.fileData[file] = fileContents;
            }
        }
        return modelLibs;
    });
}
/** Parses fileContents from getModelDb() and puts them in a list. */
export function parseModelDb(modelDbList) {
    if (!(modelDbList instanceof Array && modelDbList.length > 1))
        return [];
    const out = [];
    for (const pack of modelDbList) {
        const oPack = {
            displayName: pack.name,
            name: pack.location,
            source: pack.source,
            priority: pack.priority,
            data: [],
        };
        let count = 0;
        for (const fdKey in pack.fileData) {
            const lines = d.preprocessString(pack.fileData[fdKey]).split('\n');
            for (let i = 0; i < lines.length; ++i) {
                const line = lines[i];
                if (line === '')
                    continue;
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
        console.log(`Loaded ${count} models from pack ${oPack.name}.`);
    }
    return out;
}
/** Fully defined ltspice model */
export class LtspiceModel {
    constructor(obj, src) {
        /** If this model is defined as an AKO alias. */
        this.isAko = false;
        // Default model params
        const o = Object.assign({ modName: '', type: 'D', isAko: false, akoBaseModel: null, params: {} }, obj);
        this.modName = o.modName;
        this.type = o.type.toUpperCase();
        this.isAko = o.isAko;
        this.akoBaseModel = o.akoBaseModel;
        const params = LtspiceModel.parseParams(o.params);
        this.params = params;
        const paramKeys = Object.keys(params).map(x => x.toLowerCase());
        if (obj.type === 'VDMOS') {
            // find channel type
            let c = 'nchan'; // default
            if (paramKeys.includes('pchan'))
                c = 'pchan';
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
            line: '',
            err: null,
            params: obj.params || Object.fromEntries(Object.entries(params)
                .map(x => [x[0], x[1].toString()]))
        };
    }
    /** Maps and corrects a dict  */
    static parseParams(obj, modelType = '') {
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
    getParam(e, modelDbByName, lookAtDefaultModels = true) {
        return getParam(this, e, modelDbByName, lookAtDefaultModels, e);
    }
}
export class ParamValue {
    constructor(str) {
        this.type = 'null';
        this.v = null;
        // find type of param
        const stdObj = {
            value: str,
            toString: function () { return this.value; },
            valueOf: function () { return this.value; }
        };
        if (str === null || str === undefined) {
            this.type = 'null';
            this.v = stdObj;
        }
        else if (typeof (str) === 'number') {
            this.type = 'number';
            this.v = parseLtspiceNumber(str.toString());
        }
        else if (typeof (str) === 'string') {
            // try parse as number
            const x = parseLtspiceNumber(str);
            if (x) {
                this.type = 'number';
                this.v = x;
            }
            else {
                this.type = 'string';
                this.v = stdObj;
            }
        }
        else if (str instanceof LtspiceNumber) {
            this.type = 'number';
            this.v = str;
        }
    }
    valueOf() {
        if (this.type === 'number')
            return this.v.value;
        else
            return this.v;
    }
    toString() {
        if (this.type !== 'null')
            return this.v.toString();
        else
            return '';
    }
}
/** Joins and post-processes each given pack. */
export function joinDb(dbArray) {
    if (!(dbArray instanceof Array && dbArray.length > 1))
        return [];
    const o = [];
    for (const dB of dbArray) {
        for (const model of dB.data) {
            const p = model.p;
            // create model
            const thisModel = Object.assign({}, p);
            const src = {
                pack: dB.name,
                priority: dB.priority,
                file: model.src,
                lineIndex: model.i,
                line: model.line,
                err: model.err,
            };
            // fix some stuff on the model
            const m = new LtspiceModel(Object.assign({}, p), src);
            // push the model
            o.push(m);
        }
    }
    return o.sort((a, b) => b.src.priority - a.src.priority);
}
/** Checks if two models are the same */
export function compareModels(a, b) {
    if (a === b)
        return true;
    const c = (a, b, x, map = (x) => x) => map(a[x]) === map(b[x]);
    const cp = (x, fn = (x) => x) => c(a, b, x, fn);
    const toUp = (x) => (x) ? x.toUpperCase() : x;
    return cp('modName', toUp) &&
        cp('isAko') &&
        cp('akoBaseModel', toUp) &&
        arraysEqual(Object.keys(a.params), Object.keys(b.params)) &&
        arraysEqual(Object.values(a.params), Object.values(b.params));
}
export function getModelsByType(modelList) {
    const o = {
        BJT: [],
        D: [],
        JFET: [],
        MOSFET: [],
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
export function getModelsDict(modelList) {
    const o = {};
    for (const model of modelList) {
        if (o[model.modName] === undefined)
            o[model.modName] = [];
        const currentModelStack = o[model.modName];
        let isRepeated = false;
        for (const validModel of currentModelStack) {
            isRepeated = compareModels(validModel, model);
            if (isRepeated)
                break;
        }
        if (!isRepeated)
            currentModelStack.push(model);
    }
    return o;
}
export function getParameterAnalitics(modelList) {
    const o1 = {};
    for (const model of modelList) {
        const entries = Object.entries(model.params);
        for (const e of entries) {
            const [k, v] = e;
            if (o1[k] === undefined) {
                o1[k] = [v];
            }
            else {
                o1[k].push(v);
            }
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
        };
        const nums = o1[key].filter(x => x.type === 'number').map(x => x.v.value);
        for (const n of nums) {
            if (x.min > n)
                x.min = n;
            if (x.max < n)
                x.max = n;
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
export function getParam(model, param, modelDbByName = null, lookAtDefaultModels = true, _lastSearch = null) {
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
            return b;
        }
    }
    // 3. Inside default (if allowed)
    if (lookAtDefaultModels) {
        let c = DEFAULT_MODELS[type];
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
                return new ParamValue(e); // return a number/string;
            }
        }
    }
    console.log('Not found!');
    return undefined;
}
//# sourceMappingURL=ltspiceModelLogic.js.map