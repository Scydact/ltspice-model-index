var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { DEFAULT_MODELS, DEFAULT_MODEL_PARAM_KEYS, DEFAULT_MODEL_PARAM_KEYS_LOWERCASE, MODEL_TYPES, tryParseDefaultParam } from "./ltspiceDefaultModels.js";
import * as d from "./ltspiceModelParser.js";
import { arraysEqual, caseUnsensitiveProperty, fromEntries, getStringHashCode, LtspiceNumber, numberToHSL, objectMap, parseLtspiceNumber } from "./Utils.js";
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
export function parseModelDb(modelDbList, progressCallback = (pack_i, pack_l, file_i, file_l, line_i, line_l, libStr, fileStr) => { }) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(modelDbList instanceof Array && modelDbList.length > 1))
            return [];
        const out = [];
        //(const pack of modelDbList)
        const packLen = modelDbList.length;
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
            };
            let count = 0;
            const fileDataKeys = Object.keys(pack.fileData);
            const fdeLen = fileDataKeys.length;
            // used to be (const fdKey in pack.fileData), updated to show progress. 
            for (let fdei = 0; fdei < fdeLen; ++fdei) {
                const fdKey = fileDataKeys[fdei];
                const lines = d.preprocessString(pack.fileData[fdKey]).split('\n');
                const linesLen = lines.length;
                const progressDivs = Math.min(500, Math.max(1, Math.round(linesLen / 3.5)));
                for (let i = 0; i < linesLen; ++i) {
                    // Progress thing... 
                    // makes actual process slower, 
                    // but is better than .5s of unexplained lagging.
                    if (progressCallback && (i % progressDivs === 0) || (i === linesLen - 1)) {
                        yield progressCallback(packIdx, packLen, fdei, fdeLen, i + 1, linesLen, pack.location, fdKey);
                    }
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
    });
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
        const params = LtspiceModel.parseParams(o.params, this.type);
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
            pack: null,
            priority: 10,
            file: '',
            lineIndex: 0,
            line: '',
            err: null,
            params: obj.params || objectMap(params, x => x.toString()),
        };
    }
    /** Maps and corrects a dict  */
    static parseParams(obj, modelType = '') {
        const newParamEntries = [], TMPK = DEFAULT_MODEL_PARAM_KEYS[modelType] || [], TMPK_LC = DEFAULT_MODEL_PARAM_KEYS_LOWERCASE[modelType] || [];
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
    static getParam(model, param, modelDbByName = null, lookAtDefaultModels = true, _lastSearch = null) {
        var _a;
        const console = {
            log: (...args) => { },
        };
        let DEF_MODEL = DEFAULT_MODELS[model.type];
        let desc = ((_a = caseUnsensitiveProperty(DEF_MODEL, param)) === null || _a === void 0 ? void 0 : _a.description) || '';
        // 1. Inside given param
        let a = caseUnsensitiveProperty(model.params, param);
        if (a !== undefined) {
            console.log('Found on model');
            return { v: a, src: 'model', desc };
        }
        // 2. Inside original AKO alias.
        if (model.isAko && model.akoBaseModel) {
            console.log('Model is AKO ' + model.akoBaseModel);
            if (modelDbByName && modelDbByName[model.akoBaseModel]) {
                // Do not look at default model here!
                let akoModelElem = modelDbByName[model.akoBaseModel];
                let akoModel = (akoModelElem instanceof Array) ? akoModelElem[0] : akoModelElem;
                let b = LtspiceModel.getParam(akoModel, param, modelDbByName, false);
                if (b !== undefined) {
                    console.log('Found on AKO ' + model.akoBaseModel);
                    return Object.assign(Object.assign({}, b), { src: 'ako' });
                }
            }
            else {
                console.log('AKO model ' + model.akoBaseModel + ' could not be found.');
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
                    return Object.assign(Object.assign({}, LtspiceModel.getParam(model, e, modelDbByName, lookAtDefaultModels, e)), { src: 'default' });
                }
                if (e !== undefined) {
                    console.log('Found on DEFAULT_MODEL');
                    return { v: new ParamValue(e), src: 'default', desc }; // return a number/string;
                }
            }
        }
        console.log('Not found!');
        return { v: undefined, src: 'notFound', desc };
    }
    getParam(e, modelDbByName, lookAtDefaultModels = true) {
        return LtspiceModel.getParam(this, e, modelDbByName, lookAtDefaultModels);
    }
    getType(modelDbByName) {
        if (MODEL_TYPES.BJT.includes(this.type) ||
            MODEL_TYPES.JFET.includes(this.type)) {
            return this.type;
        }
        else if (MODEL_TYPES.MOSFET.includes(this.type)) {
            return this.mosChannel;
        }
        else if (this.type === 'D') {
            return this.getParam('type', modelDbByName).v.toString();
        }
    }
    getModelDirective() {
        let out = `.model ${this.modName} `;
        if (this.isAko)
            out += `ako:${this.akoBaseModel} `;
        out += this.type;
        if (this.params) {
            let p = [];
            for (let param in this.params) {
                let pval = this.params[param];
                if (pval.v) {
                    let val = (pval.type === 'number') ? pval.v.toString(true, true) : pval.v.toString();
                    p.push(param + '=' + val);
                }
                else {
                    p.push(param);
                }
            }
            out += `(${p.join(' ')})`;
        }
        return out;
    }
}
export class ParamValue {
    constructor(str) {
        this.type = 'null';
        this.v = null;
        // find type of param
        if (str === null || str === undefined) {
            this.type = 'null';
            this.v = {
                value: str,
                toString: function () { return this.value; },
                valueOf: function () { return this.value; }
            };
            ;
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
                this.v = {
                    value: str,
                    toString: function () { return this.value; },
                    valueOf: function () { return this.value; }
                };
                ;
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
            // create model
            const src = {
                pack: dB,
                priority: dB.priority,
                file: model.src,
                lineIndex: model.i,
                line: model.line,
                err: model.err,
            };
            // fix some stuff on the model
            const m = new LtspiceModel(model.p, src);
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
    const allModelParams = {};
    for (const model of modelList) {
        const entries = Object.entries(model.params);
        for (const e of entries) {
            const [k, v] = e;
            if (allModelParams[k] === undefined) {
                allModelParams[k] = [v];
            }
            else {
                allModelParams[k].push(v);
            }
        }
    }
    const allParamStats = {};
    for (const paramKey in allModelParams) {
        const x = {
            min: Infinity,
            max: -Infinity,
            avg: 0,
            std: 0,
            count: 0,
            strSet: new Set(),
        };
        // Get number parameters
        const nums = allModelParams[paramKey]
            .filter(x => x.type === 'number')
            .map(x => x.v.value);
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
        // Get all non-number parameters
        const etc = allModelParams[paramKey]
            .filter(x => x.type !== 'number')
            .map(x => x.v.value);
        for (const s of etc) {
            x.strSet.add(s);
            ++x.count;
        }
        allParamStats[paramKey] = x;
    }
    return allParamStats;
}
//# sourceMappingURL=ltspiceModelLogic.js.map