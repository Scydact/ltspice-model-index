var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { DEFAULT_MODELS } from "./ltspiceDefaultModels.js";
import * as d from "./ltspiceModelParser.js";
import { arraysEqual, parseLtspiceNumber } from "./Utils.js";
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
export class ParamValue {
    constructor(str) {
        this.type = 'null';
        this.value = null;
        // find type of param
        if (str === null || str === undefined) {
            this.type = 'null';
            this.value = str;
        }
        else if (typeof (str) === 'number') {
            this.type = 'number';
            this.value = parseLtspiceNumber(str.toString());
        }
        else if (typeof (str) === 'string') {
            // try parse as number
            const x = parseLtspiceNumber(str);
            if (x) {
                this.type = 'number';
                this.value = x;
            }
            else {
                this.type = 'string';
                this.value = str;
            }
        }
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
            const defaultModel = {
                modName: null,
                akoBaseModel: null,
                isAko: false,
                type: null,
                params: {},
            };
            // create model
            const thisModel = Object.assign(Object.assign(Object.assign({}, defaultModel), p), { src: {
                    pack: dB.name,
                    priority: dB.priority,
                    file: model.src,
                    lineIndex: model.i,
                    line: model.line,
                    err: model.err,
                } });
            // fix some stuff on the model
            if (thisModel.type)
                thisModel.type = thisModel.type.toUpperCase();
            const paramKeys = Object.keys(thisModel.params).map(x => x.toLowerCase());
            if (thisModel.type === 'VDMOS') {
                // find channel type
                let c = 'nchan'; // default
                if (paramKeys.includes('pchan'))
                    c = 'pchan';
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
export function compareModels(a, b) {
    const c = (a, b, x) => a[x] === b[x];
    const cp = (x) => c(a, b, x);
    if (a === b)
        return true;
    return cp('modName') &&
        cp('isAko') &&
        cp('akoBaseModel') &&
        arraysEqual(Object.keys(a.params), Object.keys(b.params)) &&
        arraysEqual(Object.values(a.params), Object.values(b.params));
}
export const MODEL_TYPES = {
    BJT: ['NPN', 'PNP'],
    D: ['D'],
    JFET: ['NJF', 'PJF'],
    MOSFET: ['VDMOS', 'NMOS', 'PMOS'],
};
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
//# sourceMappingURL=ltspiceModelLogic.js.map