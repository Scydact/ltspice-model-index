var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { createElement, createRadio, parseLtspiceNumber, setWindow, sleep } from "./Utils.js";
import * as p from "./StrParse.js";
import { DEFAULT_PARAMETERS, MODEL_TYPES } from "./ltspiceDefaultModels.js";
import { getModelDb, getModelsByType, getModelsDict, getParameterAnalitics, joinDb, parseModelDb } from "./ltspiceModelLogic.js";
/**
 * List of packs loaded from ./data/models.json.
 * Gets merged with any custom packs made/loaded from the user's PC.
 * */
let DB_PACKS = [];
/** Constants to be used globally inside the app. */
const APP = {
    /** Selected app model type (mode). [BJT, D, JFET, MOSFET] */
    mode: 'BJT',
    /** Loaded model pack definitions. */
    packs: [],
    /** All the loaded models. */
    modelList: [],
    /** HTML nodes used globally in the app. */
    nodes: {
        mainTableContainer: document.createElement('div'),
        mainTable: null,
    },
    /** Single progress bar added to the page. */
    progressBar: null,
    /** Dict where each key is a MODEL TYPE (BJT, MOSFET, D, JFET), containing a list of all the models of that kind. */
    modelsByType: {},
    /** Dict where each key is a model name, and each value is a possible model name. */
    modelsByName: {},
    /**
     * Probably the list that will be used the most.
     * Object that, for each type (BJT, D, MOSFET, JFET), contains a single model definition for every single model,
     * sorted in order of priority (update pack priority to change!).
     */
    modelsByTypeByName: {},
    /** Dict where each key is a MODEL TYPE, and each value has statistic about each parameter used on it. */
    paramStatsByModelType: {},
    /** Settings for pagination... */
    pagination: {
        limit: 50,
        lastIdx: 0,
        end: false,
    },
};
setWindow({
    p,
    getModelDb,
    parseModelDb,
    joinDb,
    APP,
});
class ProgressBar {
    constructor() {
        this.hidden = true;
        let container = document.createElement('div');
        container.classList.add('progress-container', 'hidden');
        let text = document.createElement('div');
        text.classList.add('progress-text');
        container.appendChild(text);
        let slider = document.createElement('div');
        slider.classList.add('progress-slider');
        container.appendChild(slider);
        let sliderLine = document.createElement('div');
        sliderLine.classList.add('progress-line');
        slider.appendChild(sliderLine);
        let sliderInc = document.createElement('div');
        sliderInc.classList.add('progress-subline', 'inc');
        slider.appendChild(sliderInc);
        let sliderDec = document.createElement('div');
        sliderDec.classList.add('progress-subline', 'dec');
        slider.appendChild(sliderDec);
        this.nodes = {
            container,
            text,
            slider,
            sliderLine,
            sliderInc,
            sliderDec,
        };
    }
    /**
     * Sets the progress bar visibility.
     *
     * If no parameter is given, will toggle visibility.
     */
    setVisibility(val) {
        if (val === undefined)
            return this.setVisibility(this.hidden);
        this.hidden = !val;
        this.nodes.container.classList.toggle('hidden', this.hidden);
        return this;
    }
    /** Returns the visibility value of the progress bar. */
    getVisibility() {
        return !this.hidden;
    }
    /**
     * Sets the progress bar's progress.
     *
     * If negative, will show indeterminate animation.
     */
    setProgress(n) {
        const no = this.nodes;
        if (n < 0) {
            no.slider.classList.add('indeterminate');
            // no.sliderDec.style.left = '';
            // no.sliderDec.style.width = '';
            // no.sliderInc.style.left = '';
            // no.sliderInc.style.width = '';
        }
        else {
            const n1 = Math.min(100 * n, 100).toPrecision(15);
            no.slider.classList.remove('indeterminate');
            no.sliderInc.style.width = n1 + '%';
            console.log(n1);
        }
        return this;
    }
    /** Returns the progress. */
    getProgress() {
        return this.progress;
    }
    /** Sets the message to this string. */
    setText(str) {
        this.nodes.text.innerText = str;
        return this;
    }
    /** Returns the text inside. */
    getText() {
        return this.nodes.text.innerText;
    }
    /** Clears text and sets progress to 0% */
    clear() {
        this.setText('');
        this.setProgress(0);
        return this;
    }
    /** Forces redraw (in case of some random glitch?) */
    redraw() {
        if (!this.hidden) {
            this.nodes.container.style.display = 'none';
            this.nodes.container.offsetHeight; // no need to store this anywhere, the reference is enough
            this.nodes.container.style.display = '';
        }
        return this;
    }
}
window.addEventListener('load', function () {
    document.getElementById('file-input')
        .addEventListener('change', readSingleFile, false);
    init(document.getElementById('main'));
});
function rebuildPacks() {
    return __awaiter(this, void 0, void 0, function* () {
        const t = '[Rebuilding model database]: ';
        APP.progressBar.clear().setVisibility(true);
        const ctot = 3; // amount of await progress()
        let count = 0;
        const progress = (str) => __awaiter(this, void 0, void 0, function* () {
            APP.progressBar.setProgress(++count / ctot).setText(t + str);
            yield sleep();
        });
        yield progress('Joining model packs.');
        // TODO: Custom pack support would go here (APP.packs = [...parseModeDb, ...customPacks]);
        APP.packs = [...DB_PACKS];
        APP.modelList = joinDb(APP.packs);
        yield progress('Sorting by type & model');
        APP.modelsByType = getModelsByType(APP.modelList);
        APP.modelsByName = getModelsDict(APP.modelList);
        APP.modelsByTypeByName = Object.fromEntries(Object.entries(APP.modelsByType)
            .map(x => [
            x[0],
            Object.fromEntries(Object.entries(getModelsDict(x[1]))
                .map(y => [y[0], y[1][0]]))
        ]));
        yield progress('Getting parameter statistics.');
        APP.paramStatsByModelType = Object.fromEntries(Object.entries(APP.modelsByTypeByName)
            .map(x => [x[0], getParameterAnalitics(Object.values(x[1]))]));
        APP.progressBar.clear().setVisibility(false);
    });
}
setWindow({ parseLtspiceNumber });
function init(mainNode) {
    return __awaiter(this, void 0, void 0, function* () {
        const $mainNode = $(mainNode).empty();
        // Append progress bar
        {
            let tid = 'mainProgressBarContainer';
            var x = document.getElementById(tid);
            if (x)
                document.body.removeChild(x);
            APP.progressBar = new ProgressBar();
            let d = document.createElement('div');
            d.id = tid;
            d.appendChild(APP.progressBar.nodes.container);
            document.body.appendChild(d);
        }
        // Create mode selection thing 
        {
            let container = createElement(mainNode, 'div', null, ['select-mode-container']);
            createElement(container, 'h4', 'Tipos de modelos:');
            let d = createElement(container, 'form', null, ['select-mode']);
            for (const type in MODEL_TYPES) {
                let fn = () => {
                    APP.mode = type;
                    // todo: update_tables()?
                    populateTable();
                };
                let selected = APP.mode === type;
                createRadio(d, 'userSelect', type, fn, selected);
            }
            mainNode.appendChild(container);
        }
        // Main table init
        {
            let { mainTableContainer } = APP.nodes;
            mainTableContainer.id = 'mainTableContainer';
            mainNode.appendChild(mainTableContainer);
            // Add updatePagination on scroll
            window.onscroll = function () {
                if ((window.innerHeight + window.pageYOffset) >= document.body.offsetHeight - 1.5 * window.innerHeight) {
                    paginateTable();
                }
            };
        }
        // Load models from data/models and initialize table.
        {
            APP.progressBar
                .setProgress(-1)
                .setText('Downloading models from packs...')
                .setVisibility(true);
            const modelDb = yield getModelDb();
            APP.progressBar
                .setProgress(0.33)
                .setText('Parsing models...');
            const updateFn = (a, al, b, bl, c, cl, libStr, fileStr) => __awaiter(this, void 0, void 0, function* () {
                const p = (a + (b + (c / cl)) / bl) / al;
                const ps = (100 * p).toFixed(2);
                const s = `(${ps}%) Parsing file \n${libStr}/${fileStr}`;
                APP.progressBar.setProgress(p).setText(s);
                yield sleep();
            });
            yield sleep();
            DB_PACKS = yield parseModelDb(modelDb, updateFn);
            yield sleep();
            yield rebuildPacks();
            yield sleep();
            populateTable();
        }
    });
}
function populateTable() {
    const tbl = document.createElement('table');
    const thead = tbl.createTHead();
    const rhead = thead.insertRow();
    rhead.insertCell().innerText = 'Model name';
    rhead.insertCell().innerText = 'Library';
    rhead.insertCell().innerText = 'Type';
    for (const x of DEFAULT_PARAMETERS[APP.mode]) {
        rhead.insertCell().innerText = x;
    }
    rhead.insertCell().innerText = 'Model definition';
    APP.pagination.end = false;
    APP.pagination.lastIdx = 0;
    APP.nodes.mainTable = tbl;
    paginateTable();
    // Replace old table
    const { mainTableContainer } = APP.nodes;
    $(mainTableContainer).empty();
    mainTableContainer.appendChild(tbl);
}
function paginateTable() {
    var _a;
    if (APP.pagination.end)
        return;
    const tbl = APP.nodes.mainTable;
    const tbody = tbl.createTBody();
    const currModels = APP.modelsByTypeByName[APP.mode];
    const dictGetTypeParameter = {
        BJT: (model) => model.type,
        JFET: (model) => model.type,
        D: (model) => { var _a; return (_a = model.params.type) === null || _a === void 0 ? void 0 : _a.v.value.toString(); },
        MOSFET: (model) => model.mosChannel,
    }; // TODO: Move inside model
    const getTypeParam = dictGetTypeParameter[APP.mode];
    const modelEntries = Object.entries(currModels);
    const meLen = modelEntries.length;
    let startIdx = APP.pagination.lastIdx;
    let endIdx = Math.min(meLen, APP.pagination.limit + startIdx);
    if (endIdx === meLen)
        APP.pagination.end = true;
    APP.pagination.lastIdx = endIdx + 1;
    for (let i = startIdx; i < endIdx; ++i) {
        const [modelName, model] = modelEntries[i];
        let r = tbody.insertRow();
        r.insertCell().innerText = modelName;
        r.insertCell().innerText = model.src.pack;
        r.insertCell().innerText = getTypeParam(model);
        for (const x of DEFAULT_PARAMETERS[APP.mode]) {
            //model.params[x]?.v.toString();
            const a = model.getParam(x, currModels);
            const b = (_a = a.v) === null || _a === void 0 ? void 0 : _a.toString();
            const specialChars = {
                undefined: ' ',
                Infinity: '∞',
            };
            let c = r.insertCell();
            c.innerText = specialChars[b] || b;
            if (a.src === 'default')
                c.style.color = 'blue';
            else if (a.src === 'ako')
                c.style.color = 'green';
            else if (a.src === 'notFound')
                c.style.color = 'red';
        }
        r.insertCell().innerText = model.src.line;
    }
}
/** Some file input function??? */
function readSingleFile(e) {
    var file = e.target.files[0];
    setWindow('files', e.target.files);
    if (!file) {
        return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
        var contents = e.target.result;
        displayContents(contents);
    };
    reader.readAsText(file);
}
function displayContents(contents) {
    if (contents) {
        var element = document.getElementById('file-content');
        element.textContent = contents.toString();
    }
}
//# sourceMappingURL=main.js.map