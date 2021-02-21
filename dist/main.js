var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { createElement, createRadio, filterAll, parseLtspiceNumber, setWindow, sleep } from "./Utils.js";
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
        filterContainer: null,
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
    /** LtfilterManager */
    filterManager: null,
    /** Current table settings */
    currentTable: [],
};
setWindow({
    p,
    getModelDb,
    parseModelDb,
    joinDb,
    APP,
    parseLtspiceNumber,
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
        }
        else {
            const n1 = Math.min(100 * n, 100).toPrecision(15);
            no.slider.classList.remove('indeterminate');
            no.sliderInc.style.width = n1 + '%';
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
//#endregion
//#region Main section
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
            createElement(container, 'h4', 'Model types:');
            let d = createElement(container, 'form', null, ['select-mode']);
            for (const type in MODEL_TYPES) {
                let fn = () => {
                    APP.mode = type;
                    // todo: update_tables()?
                    console.log(APP.mode);
                    populateTable();
                };
                let selected = APP.mode === type;
                createRadio(d, 'userSelect', type, fn, selected);
            }
            mainNode.appendChild(container);
        }
        // Create filter selection thing
        {
            let container = createElement(mainNode, 'div', null, ['filter-mode-container']);
            createElement(container, 'h4', 'Filters:');
            APP.filterManager = new LtFilterManager();
            container.appendChild(APP.filterManager.node);
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
    console.log('a');
    const thisModeModels = Object.values(APP.modelsByTypeByName[APP.mode]);
    APP.currentTable = APP.filterManager.filter(thisModeModels);
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
    // Footer (load more models!)
    const tfoot = tbl.createTFoot();
    let footcell = tfoot.insertRow().insertCell();
    footcell.colSpan = rhead.childElementCount;
    footcell.innerText = ' - ';
    footcell.addEventListener('click', paginateTable);
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
    /** Contains all the models of the same type (BJT, D, JFET, MOSFET) */
    const currModels = APP.modelsByTypeByName[APP.mode];
    const dictGetTypeParameter = {
        BJT: (model) => model.type,
        JFET: (model) => model.type,
        D: (model) => { var _a; return (_a = model.params.type) === null || _a === void 0 ? void 0 : _a.v.value.toString(); },
        MOSFET: (model) => model.mosChannel,
    }; // TODO: Move inside model
    const getTypeParam = dictGetTypeParameter[APP.mode];
    const modelEntries = APP.currentTable;
    const meLen = modelEntries.length;
    let startIdx = APP.pagination.lastIdx;
    let endIdx = Math.min(meLen, APP.pagination.limit + startIdx);
    if (endIdx === meLen)
        APP.pagination.end = true;
    APP.pagination.lastIdx = endIdx + 1;
    for (let i = startIdx; i < endIdx; ++i) {
        const model = modelEntries[i], modelName = model.modName;
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
    const foot = tbl.tFoot.firstElementChild.firstElementChild;
    if (APP.pagination.end) {
        foot.innerText = `All models (${endIdx}) listed.`;
    }
    else {
        foot.innerText = `Loaded ${endIdx} of ${meLen}. ` +
            `\n[Click to load +${Math.min(APP.pagination.limit, meLen - endIdx)}]`;
    }
}
class LtFilterManager {
    constructor() {
        this.node = document.createElement('div');
        this.filterListNode = document.createElement('div');
        this.filters = [];
        this.inputNodes = {
            addBtn: document.createElement('button'),
            updateBtn: document.createElement('button'),
        };
        let upperContainer = createElement(this.node, 'div');
        upperContainer.appendChild(this.inputNodes.addBtn);
        upperContainer.appendChild(this.inputNodes.updateBtn);
        $(this.node)
            .addClass('filter-list-container')
            .append(upperContainer)
            .append(this.filterListNode);
        $(this.inputNodes.addBtn)
            .text('+')
            .on('click', (evt) => {
            let newFilter = new LtFilter('string', (x) => x.modName, 'Model Name');
            this.addFilter(newFilter);
        });
        $(this.inputNodes.updateBtn)
            .text('Update')
            .on('click', (evt) => {
            populateTable();
        });
        $(this.filterListNode).addClass('filter-list');
    }
    addFilter(filter) {
        this.filters.push(filter);
        this.filterListNode.appendChild(filter.node);
    }
    filter(models) {
        if (this.filters.length === 0)
            return models;
        let filters = this.filters.map(x => x.getFilter());
        let fn = (model) => filterAll(model, filters);
        return models.filter(fn);
    }
}
class LtFilter {
    constructor(filterModes, modelPropGetter, description = '') {
        /** Parsed inputs. */
        this.inputs = {
            selector: null,
            val: null,
            valB: null,
        };
        this.evtSelectorUpdate = () => {
            this.inputs.selector = this.internalNodes.selector.value;
        };
        this.evtValUpdate = () => {
            var _a;
            let key = this.inputs.selector, validator = (_a = this.filterFnDesc[key].val) === null || _a === void 0 ? void 0 : _a.validator;
            if (validator) {
                let x = validator(this.internalNodes.val.value);
                if (x) {
                    this.internalNodes.val.value = x.str;
                    this.inputs.val = x.val;
                }
            }
            else {
                this.internalNodes.val.value = '';
                this.inputs.val = null;
            }
        };
        this.evtValBUpdate = () => {
            var _a;
            let key = this.inputs.selector, validator = (_a = this.filterFnDesc[key].valB) === null || _a === void 0 ? void 0 : _a.validator;
            if (validator) {
                let x = validator(this.internalNodes.valB.value);
                if (x) {
                    this.internalNodes.valB.value = x.str;
                    this.inputs.valB = x.val;
                }
            }
            else {
                this.internalNodes.valB.value = '';
                this.inputs.valB = null;
            }
        };
        this.modelPropGetter = modelPropGetter;
        this.node = document.createElement('div');
        this.node.classList.add('filter-container');
        this.internalNodes = {
            description: document.createElement('span'),
            selector: document.createElement('select'),
            val: document.createElement('input'),
            valB: document.createElement('input'),
            valDesc: document.createElement('label'),
            valBDesc: document.createElement('label'),
        };
        $(this.node)
            .append(this.internalNodes.description)
            .append(this.internalNodes.selector)
            .append(this.internalNodes.valDesc)
            .append(this.internalNodes.val)
            .append(this.internalNodes.valBDesc)
            .append(this.internalNodes.valB);
        // Add event listeners and other parameters.
        this.internalNodes.description.innerText = description;
        if (filterModes === 'number') {
            this.filterFnDesc = Object.assign({}, DEFAULT_FILTER_FN_NUMBER);
        }
        else if (filterModes === 'string') {
            this.filterFnDesc = Object.assign({}, DEFAULT_FILTER_FN_STRING);
        }
        else {
            this.filterFnDesc = Object.assign({}, filterModes);
        }
        this.internalNodes.selector
            .addEventListener('change', this.evtSelectorUpdate);
        this.internalNodes.val
            .addEventListener('change', this.evtValUpdate);
        this.internalNodes.valB
            .addEventListener('change', this.evtValBUpdate);
        this.reloadSelectors();
    }
    /** Returns the filter function */
    getFilter() {
        let x = this.inputs.selector, y = this.filterFnDesc[x];
        if (y)
            return (model) => y.fn(this)(this.modelPropGetter(model));
    }
    selectorChange() {
        let newFilterKey = this.internalNodes.selector.value, newFilter = this.filterFnDesc[newFilterKey];
        if (newFilter) {
            let { display, val, valB } = newFilter;
            this.inputs.selector = newFilterKey;
        }
    }
    /** Reloads selectors from this.filterFunctions */
    reloadSelectors() {
        let selector = this.internalNodes.selector;
        $(selector).empty();
        for (let key in this.filterFnDesc) {
            let val = this.filterFnDesc[key].display;
            let opt = document.createElement('option');
            opt.value = key;
            opt.innerText = val;
            selector.appendChild(opt);
        }
        selector.value = Object.keys(this.filterFnDesc)[0];
        this.evtSelectorUpdate();
    }
    // Aux functions
    static toleranceValidator(s) {
        s = s.trim();
        if (s.slice(-1) === '%') {
            let x = parseFloat(s.slice(0, -1));
            if (isNaN(x))
                return null;
            return {
                str: x.toString() + '%',
                val: { type: 'rel', val: x }
            };
        }
        else {
            let x = parseLtspiceNumber(s);
            if (!x)
                return null;
            return {
                str: s,
                val: { type: 'abs', val: x }
            };
        }
    }
    static ltspiceNumberValidator(s) {
        let x = parseLtspiceNumber(s);
        if (!x)
            return null;
        return {
            str: s,
            val: x,
        };
    }
    static stringCaseInsensitiveValidator(s) {
        return {
            str: s.trim(),
            val: s.trim().toLowerCase(),
        };
    }
}
const DEFAULT_FILTER_FN_NUMBER = {
    '=': {
        fn: (filter) => {
            let { val, valB } = filter.inputs, valMatch = val.valueOf(), valTol = (valB.type === 'abs') ? valB.val.valueOf() : valB.val;
            if (valB.type === 'abs') {
                if (valTol === 0) {
                    return (x) => x === valMatch;
                }
                else {
                    return (x) => Math.abs(x - valMatch) < valTol;
                }
            }
            else {
                return (x) => Math.abs(x - valMatch) < valMatch * valTol;
            }
        },
        display: '=',
        val: {
            description: 'Equal to',
            validator: LtFilter.ltspiceNumberValidator,
        },
        valB: {
            description: 'Tolerance',
            validator: LtFilter.toleranceValidator,
        },
    },
    '!=': {
        fn: (filter) => {
            let equalfn = filter.filterFnDesc['='].fn(filter);
            return (x) => !equalfn(x);
        },
        display: '≠',
        val: {
            description: 'Not equal to',
            validator: LtFilter.ltspiceNumberValidator,
        },
        valB: {
            description: 'Tolerance',
            validator: LtFilter.toleranceValidator,
        },
    },
    '>=': {
        fn: (filter) => {
            let val = filter.inputs.val.valueOf();
            return (x) => x >= val;
        },
        display: '≥',
        val: {
            description: 'Greater than',
            validator: LtFilter.ltspiceNumberValidator,
        },
    },
    '<=': {
        fn: (filter) => {
            let val = filter.inputs.val.valueOf();
            return (x) => x <= val;
        },
        display: '≤',
        val: {
            description: 'Less than',
            validator: LtFilter.ltspiceNumberValidator,
        },
    },
};
const DEFAULT_FILTER_FN_STRING = {
    '=': {
        fn: (filter) => {
            let value = filter.inputs.val;
            return (x) => {
                return x.toLowerCase().includes(value);
            };
        },
        display: '=',
        val: {
            description: 'Matches',
            validator: LtFilter.stringCaseInsensitiveValidator,
        },
    },
    '!=': {
        fn: (filter) => {
            let equalfn = filter.filterFnDesc['='].fn(filter);
            return (x) => !equalfn(x);
        },
        display: '≠',
        val: {
            description: 'Does not match',
            validator: LtFilter.stringCaseInsensitiveValidator,
        },
    },
};
setWindow({ LtFilter });
//#endregion
//#region Unused?
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
//#endregion
//# sourceMappingURL=main.js.map