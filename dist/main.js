var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { createElement, createRadio, filterAll, genericSort, objectMap, parseLtspiceNumber, setWindow, sleep } from "./Utils.js";
import * as p from "./StrParse.js";
import { DEFAULT_PARAMETERS, MODEL_TYPES, MODEL_TYPES_PARAMS } from "./ltspiceDefaultModels.js";
import { getModelDb, getModelsByType, getModelsDict, getParameterAnalitics, joinDb, parseModelDb } from "./ltspiceModelLogic.js";
import { COMMON_FILTERS, COMMON_FILTERS_BY_MODEL, LtFilter } from "./ltspiceModelFilter.js";
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
        APP.paramStatsByModelType = objectMap(APP.modelsByTypeByName, x => getParameterAnalitics(Object.values(x)));
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
                    APP.filterManager.filters = [];
                    APP.filterManager.reloadDropdown();
                    APP.filterManager.reloadNodeList();
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
            APP.filterManager.reloadDropdown();
            populateTable();
        }
    });
}
function populateTable() {
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
            addBtnDropdownContainer: document.createElement('div'),
            updateBtn: document.createElement('button'),
        };
        this.filterEvents = {
            change: (evt) => {
                /*
                TODO: Update on filter change,
                 - ADD DIODE BY TYPE FILTER!!!
                 - Try to debounce (100ms?),
                 - If take too long (50ms?), stop auto update until next reload.
                 - Set change event to have a "trigger" prop, either 'change' or 'keyup' (source of the original event)
                 - Add 'priority' to filters, and sort by it on getAvaiableFilters (priority = count?)
                 - Add 'repeatPriority', which modifies the priority per repeat.
                 - Add 'repeat', which limits the amount of times a filter can appear.
                 - Add a way to export custom filters...
                    (probly a customFilter that has 'param, selector, val1, val2'?)
                */
            },
            move: (evt) => {
                this.moveFilter(evt.detail.filter, evt.detail.direction);
            },
            delete: (evt) => {
                this.removeFilter(evt.detail.filter);
            },
        };
        this.addFilterDropdownManager = new FilterDropdownListManager(this);
        let upperContainer = createElement(this.node, 'div');
        $(upperContainer)
            .append(this.inputNodes.addBtnDropdownContainer)
            .append(this.inputNodes.updateBtn);
        $(this.node)
            .addClass('filter-list-container')
            .append(upperContainer)
            .append(this.filterListNode);
        $(this.inputNodes.addBtn)
            .addClass('btn')
            .text('+')
            .on('click', (evt) => {
            // let newFilter = new LtFilter('string', (x: LtspiceModel) => x.modName, 'Model Name')
            // this.addFilter(newFilter);
            let fdm = this.addFilterDropdownManager;
            if (fdm.node.classList.contains('hidden')) {
                fdm.updateFilterDefinition();
                fdm.node.classList.remove('hidden');
            }
            else
                fdm.node.classList.add('hidden');
        })
            .appendTo(this.inputNodes.addBtnDropdownContainer);
        $(this.addFilterDropdownManager.node)
            .appendTo(this.inputNodes.addBtnDropdownContainer);
        $(this.inputNodes.updateBtn)
            .addClass('btn')
            .text('Update')
            .on('click', (evt) => {
            populateTable();
        });
        $(this.filterListNode).addClass('filter-list');
    }
    addFilter(filter, index, addEvents = true) {
        if (!(filter instanceof LtFilter)) {
            console.log('Object is not a filter!: ', filter);
            return;
        }
        if (index === undefined)
            index = this.filters.length;
        index = Math.min(this.filters.length, Math.max(0, index));
        //this.filters.push(filter);
        this.filters = [...this.filters.slice(0, index), filter, ...this.filters.slice(index)];
        if (this.filterListNode.children[index])
            this.filterListNode.insertBefore(filter.node, this.filterListNode.children[index]);
        else
            this.filterListNode.appendChild(filter.node);
        if (addEvents) {
            filter.node.addEventListener('change', this.filterEvents.change);
            filter.node.addEventListener('move', this.filterEvents.move);
            filter.node.addEventListener('delete', this.filterEvents.delete);
        }
    }
    moveFilter(filter, direction) {
        let idx = this.filters.indexOf(filter);
        if (idx !== -1) {
            let newIdx = idx + direction;
            if (newIdx >= 0 && newIdx < this.filters.length) {
                this.removeFilter(filter, false);
                this.addFilter(filter, idx + direction, false);
            }
        }
    }
    removeFilter(filter, removeEvents = true) {
        this.filters = this.filters.filter(x => x !== filter);
        this.filterListNode.removeChild(filter.node);
        if (removeEvents) {
            filter.node.removeEventListener('change', this.filterEvents.change);
            filter.node.removeEventListener('move', this.filterEvents.move);
            filter.node.removeEventListener('delete', this.filterEvents.delete);
        }
    }
    filter(models) {
        if (this.filters.length === 0)
            return models;
        let filters = this.filters.map(x => x.getFilter());
        let fn = (model) => filterAll(model, filters);
        return models.filter(fn);
    }
    /** Redraws filterListNode */
    reloadNodeList() {
        $(this.filterListNode).empty();
        for (let p of this.filters) {
            this.filterListNode.appendChild(p.node);
        }
    }
    reloadDropdown() {
        this.addFilterDropdownManager
            .updateFilterDefinition(this.getAvailableFilters());
    }
    getAvailableFilters() {
        const MTYPE = APP.mode;
        const CURR_MODELS = APP.modelsByTypeByName[MTYPE];
        const PARAM_STATS = APP.paramStatsByModelType[MTYPE];
        const DEF_MODEL_PARAMS = MODEL_TYPES_PARAMS[MTYPE];
        let allModelTypes = COMMON_FILTERS;
        let specificModelType = COMMON_FILTERS_BY_MODEL[MTYPE] || [];
        // For each parameter
        let byParameter = [];
        for (const PARAM_KEY in PARAM_STATS) {
            let paramStats = PARAM_STATS[PARAM_KEY];
            let defParam = DEF_MODEL_PARAMS[PARAM_KEY];
            let description = (defParam) ? defParam.description : '';
            let paramDefOut = (paramStats.strSet.size) ? '' : NaN;
            let paramType = (paramStats.strSet.size) ? 'string' : 'number';
            let descStr = PARAM_KEY.bold();
            if (description !== '')
                descStr += description;
            console.log(descStr);
            let filter = new LtFilter(paramType, (model) => {
                let a = model.getParam(PARAM_KEY, CURR_MODELS);
                if (a && a.v && a.v && a.v.v && a.v.v.valueOf)
                    return a.v.v.valueOf();
                else
                    return paramDefOut;
            }, descStr, (paramType === 'string') ? '' : (paramStats.avg).toPrecision(3), (paramType === 'string') ? '' : (paramStats.std).toPrecision(3));
            byParameter.push({
                name: PARAM_KEY,
                description,
                filter,
                count: paramStats.count,
            });
        }
        byParameter.sort((a, b) => (b.count - a.count));
        return [
            ...specificModelType,
            ...allModelTypes,
            ...byParameter,
        ];
    }
}
class FilterDropdownListManager {
    constructor(fm) {
        this.node = document.createElement('div');
        this.txtInput = document.createElement('input');
        this.txt = '';
        this.listNode = document.createElement('div');
        this.avail = [];
        this.fm = fm;
        this.txtInput.addEventListener('input', (evt) => {
            this.txt = evt.target.value;
            this.updateFilterDefinition();
        });
        $(this.node)
            .addClass(['filter-list-add', 'hidden'])
            .append(this.txtInput)
            .append(this.listNode);
    }
    updateFilterDefinition(newFilterDefinitions) {
        // Add and create nodes for each filter definition.
        if (newFilterDefinitions) {
            const filterMapper = (x) => {
                let b = document.createElement('div');
                $(b)
                    .addClass('filter-add-element')
                    .append($(`<span class='filter-title'>${x.name}</span>`))
                    .append($(`<span class='filter-description'>${x.description}</span>`))
                    .on('click', () => {
                    this.fm.addFilter(x.filter);
                    this.node.classList.add('hidden');
                });
                return Object.assign(Object.assign({}, x), { domNode: b, nameLC: x.name.toLowerCase(), descriptionLC: x.description.toLowerCase() });
            };
            this.avail = newFilterDefinitions.map(filterMapper);
        }
        // Clear node
        let t = this.txt.toLowerCase();
        const getMatchIndexN = (x) => {
            let m1 = x.nameLC.match(t);
            let c = (x.count === undefined) ? 1e4 : x.count;
            if (m1)
                return c + 1 - m1.index / x.nameLC.length;
            else
                return 0;
        };
        const getMatchIndexD = (x) => {
            let m1 = x.descriptionLC.match(t);
            if (m1)
                return t.length / x.nameLC.length;
            else
                return 0;
        };
        const a = this.avail
            .filter(x => {
            return !this.fm.filters.includes(x.filter) && (x.nameLC.includes(t) ||
                x.descriptionLC.includes(t));
        })
            .sort((a, b) => genericSort(getMatchIndexN(b), getMatchIndexN(a)) ||
            genericSort(getMatchIndexD(b), getMatchIndexD(a)));
        while (this.listNode.firstChild) {
            this.listNode.removeChild(this.listNode.firstChild);
        }
        for (let f of a)
            this.listNode.appendChild(f.domNode);
    }
}
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