import {
    createElement,
    createRadio,
    filterAll,
    genericSort,
    LtspiceNumber,
    objectMap,
    parseLtspiceNumber,
    setWindow,
    sleep
} from "./Utils.js";
import * as d from "./ltspiceModelParser.js";
import * as p from "./StrParse.js";
import { DEFAULT_MODELS, DEFAULT_PARAMETERS, DIODE_TYPES, DIODE_TYPES_LC, getParamUnit, i_defaultParamDefinition, MODEL_TYPES, MODEL_TYPES_PARAMS, MODEL_TYPE_TO_GENERAL_TYPE } from "./ltspiceDefaultModels.js";
import {
    getModelDb,
    getModelsByType,
    getModelsDict,
    getParameterAnalitics,
    LtspiceModel,
    i_modelPack,
    joinDb,
    parseModelDb
} from "./ltspiceModelLogic.js";
import { COMMON_FILTERS, COMMON_FILTERS_BY_MODEL, i_filterDefinition, LtFilter } from "./ltspiceModelFilter.js";
import { param } from "jquery";

//#region Basics
declare const $: JQueryStatic;

/** 
 * List of packs loaded from ./data/models.json. 
 * Gets merged with any custom packs made/loaded from the user's PC.
 * */
let DB_PACKS: i_modelPack[] = [];

/** Constants to be used globally inside the app. */
const APP = {
    /** Selected app model type (mode). [BJT, D, JFET, MOSFET] */
    mode: 'BJT' as keyof typeof MODEL_TYPES,
    /** Loaded model pack definitions. */
    packs: [] as i_modelPack[],
    /** All the loaded models. */
    modelList: [] as LtspiceModel[],
    /** HTML nodes used globally in the app. */
    nodes: {
        mainTableContainer: document.createElement('div'),
        mainTable: null as HTMLTableElement,
        filterContainer: null as HTMLElement,
    },
    /** Single progress bar added to the page. */
    progressBar: null as ProgressBar,
    /** Dict where each key is a MODEL TYPE (BJT, MOSFET, D, JFET), containing a list of all the models of that kind. */
    modelsByType: {} as { [key: string]: LtspiceModel[] },
    /** Dict where each key is a model name, and each value is a possible model name. */
    modelsByName: {} as { [key: string]: LtspiceModel[] },
    /** 
     * Probably the list that will be used the most. 
     * Object that, for each type (BJT, D, MOSFET, JFET), contains a single model definition for every single model,
     * sorted in order of priority (update pack priority to change!).
     */
    modelsByTypeByName: {} as { [key: string]: { [key: string]: LtspiceModel } },
    /** Dict where each key is a MODEL TYPE, and each value has statistic about each parameter used on it. */
    paramStatsByModelType: {} as { [key: string]: ReturnType<typeof getParameterAnalitics> },

    /** Settings for pagination... */
    pagination: {
        limit: 100,
        lastIdx: 0,
        end: false,
    },

    /** LtfilterManager */
    filterManager: null as LtFilterManager,

    /** Current table settings */
    currentTable: [] as LtspiceModel[],
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
    nodes: {
        container: HTMLElement,
        text: HTMLElement,
        slider: HTMLElement,
        sliderLine: HTMLElement,
        sliderInc: HTMLElement,
        sliderDec: HTMLElement,
    }
    progress: 0;
    hidden: boolean = true;

    constructor() {

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
        }
    }

    /**
     * Sets the progress bar visibility.
     * 
     * If no parameter is given, will toggle visibility.
     */
    setVisibility(val?: boolean) {
        if (val === undefined) return this.setVisibility(this.hidden);
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
    setProgress(n: number) {
        const no = this.nodes;
        if (n < 0) {
            no.slider.classList.add('indeterminate');
        } else {
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
    setText(str: string) {
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

async function rebuildPacks() {

    const t = '[Rebuilding model database]: ';
    APP.progressBar.clear().setVisibility(true);
    const ctot = 3; // amount of await progress()
    let count = 0;
    const progress = async (str) => {
        APP.progressBar.setProgress(++count / ctot).setText(t + str);
        await sleep();
    }

    await progress('Joining model packs.');
    // TODO: Custom pack support would go here (APP.packs = [...parseModeDb, ...customPacks]);
    APP.packs = [...DB_PACKS];
    APP.modelList = joinDb(APP.packs);

    await progress('Sorting by type & model');
    APP.modelsByType = getModelsByType(APP.modelList);
    APP.modelsByName = getModelsDict(APP.modelList);
    APP.modelsByTypeByName = Object.fromEntries(
        Object.entries(APP.modelsByType)
            .map(x => [
                x[0],
                Object.fromEntries(
                    Object.entries(getModelsDict(x[1]))
                        .map(y => [y[0], y[1][0]])
                )
            ])
    );

    await progress('Getting parameter statistics.');
    APP.paramStatsByModelType = objectMap(
        APP.modelsByTypeByName,
        x => getParameterAnalitics(Object.values(x))
    );

    APP.progressBar.clear().setVisibility(false);
}


async function init(mainNode) {
    const $mainNode = $(mainNode).empty();

    // Append progress bar
    {
        let tid = 'mainProgressBarContainer';
        var x = document.getElementById(tid);
        if (x) document.body.removeChild(x);

        APP.progressBar = new ProgressBar();
        let d = document.createElement('div');
        d.id = tid;
        d.appendChild(APP.progressBar.nodes.container)
        document.body.appendChild(d);
    }

    // Create mode selection thing 
    {
        let container = createElement(mainNode, 'div', null, ['select-mode-container']);
        createElement(container, 'h4', 'Model types:');
        let d = createElement(container, 'form', null, ['select-mode']);

        for (const type in MODEL_TYPES) {
            let fn = () => {
                APP.mode = type as any;
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

        const modelDb = await getModelDb();

        APP.progressBar
            .setProgress(0.33)
            .setText('Parsing models...');

        const updateFn = async (a, al, b, bl, c, cl, libStr, fileStr) => {
            const p = (a + (b + (c / cl)) / bl) / al;
            const ps = (100 * p).toFixed(2);
            const s = `(${ps}%) Parsing file \n${libStr}/${fileStr}`
            APP.progressBar.setProgress(p).setText(s);
            await sleep();
        };

        await sleep();
        DB_PACKS = await parseModelDb(modelDb, updateFn);
        await sleep();
        await rebuildPacks();
        await sleep();

        APP.filterManager.reloadDropdown();
        populateTable();
    }
}

function populateTable() {
    const thisModeModels = Object.values(APP.modelsByTypeByName[APP.mode]);
    APP.currentTable = APP.filterManager.filter(thisModeModels);
    const tbl = document.createElement('table');

    const thead = tbl.createTHead();
    const rhead = thead.insertRow();
    rhead.insertCell().innerText = 'Lib';
    rhead.insertCell().innerText = 'Model name';
    rhead.insertCell().innerText = 'Type';

    for (const x of DEFAULT_PARAMETERS[APP.mode]) {
        rhead.insertCell().innerText = x;
    }

    // rhead.insertCell().innerText = 'Model definition';

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
    if (APP.pagination.end) return;

    const tbl = APP.nodes.mainTable;
    const tbody = tbl.createTBody();

    /** Contains all the models of the same type (BJT, D, JFET, MOSFET) */
    const currModels = APP.modelsByTypeByName[APP.mode];
    const modelEntries = APP.currentTable;
    const meLen = modelEntries.length;

    let startIdx = APP.pagination.lastIdx;
    let endIdx = Math.min(meLen, APP.pagination.limit + startIdx);

    if (endIdx === meLen) APP.pagination.end = true;
    APP.pagination.lastIdx = endIdx + 1;

    for (let i = startIdx; i < endIdx; ++i) {
        const model = modelEntries[i],
            modelName = model.modName;

        let r = tbody.insertRow();
        $(r.insertCell())
            .addClass('lib-td')
            .append(CreateSpecialNode.library(model.src.pack.logo));
        r.insertCell().appendChild(CreateSpecialNode.modelName(model))
        r.insertCell().innerText = model.getType(currModels);

        for (const x of DEFAULT_PARAMETERS[APP.mode]) {
            r.insertCell().appendChild(CreateSpecialNode.param(model, x))
        }

        // r.insertCell().innerText = model.src.line;
    }

    const foot = tbl.tFoot.firstElementChild.firstElementChild as HTMLElement;
    if (APP.pagination.end) {
        foot.innerText = `All models (${endIdx}) listed.`;
    } else {
        foot.innerText = `Loaded ${endIdx} of ${meLen}. ` +
            `\n[Click to load +${Math.min(APP.pagination.limit, meLen - endIdx)}]`;
    }
}

const CreateSpecialNode = {
    library: (model_src: { name: string, color: string }) => {
        return $('<span class="lib">' + model_src.name + '</span>')
            .css('background-color', model_src.color).get()[0]
    },
    param: (model: LtspiceModel, param: string) => {
        const a = model.getParam(param, APP.modelsByName);
        const b = a.v?.toString();
        const specialChars = {
            undefined: ' ',
            Infinity: '∞',
        };
        const c = specialChars[b] || b;
        let d = (c === '0' || Object.values(specialChars).includes(c)) ? '' : getParamUnit(param, model.type);
        if (d[0] === '1' || d.length > 3) d = '[' + d + ']';
        let outSpan = document.createElement('span');
        outSpan.innerText = c + d;
        if (a.src === 'default') outSpan.classList.add('m-src-default');
        else if (a.src === 'ako') outSpan.classList.add('m-src-ako');
        else if (a.src === 'notFound') outSpan.classList.add('m-src-none');
        return outSpan;
    },
    modelName: (model: LtspiceModel) => {
        return $('<span></span>')
            .text(model.modName)
            .addClass('model-clickable')
            .on('click', () => showModelDetails(model))
            .get()[0];
    }
}

class LtFilterManager {
    node = document.createElement('div');
    filterListNode = document.createElement('div');
    filters = [] as LtFilter[];
    inputNodes = {
        addBtn: document.createElement('button'),
        addBtnDropdownContainer: document.createElement('div'),
        updateBtn: document.createElement('button'),
    }
    addFilterDropdownManager: FilterDropdownListManager;
    filterEvents = {
        change: (evt: CustomEvent) => {
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
            populateTable();
        },
        move: (evt: CustomEvent) => {
            this.moveFilter(evt.detail.filter, evt.detail.direction);
            populateTable();
        },
        delete: (evt: CustomEvent) => {
            this.removeFilter(evt.detail.filter);
            populateTable();
        },
    }

    constructor() {
        this.addFilterDropdownManager = new FilterDropdownListManager(this);
        let upperContainer = createElement(this.node, 'div');
        $(upperContainer)
            .append(this.inputNodes.addBtnDropdownContainer)
            .append(this.inputNodes.updateBtn)

        $(this.node)
            .addClass('filter-list-container')
            .append(upperContainer)
            .append(this.filterListNode);

        const fdm = this.addFilterDropdownManager;
        const toggleFilterList = () => {
            // let newFilter = new LtFilter('string', (x: LtspiceModel) => x.modName, 'Model Name')
            // this.addFilter(newFilter);
            if (fdm.node.classList.contains('hidden')) {
                fdm.updateFilterDefinition();
                fdm.node.classList.remove('hidden');
            } else
                fdm.node.classList.add('hidden');
        }

        $(this.filterListNode)
            .on('mousedown', () => {
                if (this.filters.length === 0)
                    toggleFilterList();
            })
        $(document)
            .on('keyup', (e) => {
                if (e.key === 'Escape' && !fdm.node.classList.contains('hidden'))
                    toggleFilterList();
            })

        $(this.inputNodes.addBtn)
            .addClass('btn')
            .text('+')
            .on('click', toggleFilterList)
            .appendTo(this.inputNodes.addBtnDropdownContainer)


        $(this.addFilterDropdownManager.node)
            .appendTo(this.inputNodes.addBtnDropdownContainer)

        $(this.inputNodes.updateBtn)
            .addClass('btn')
            .text('Update')
            .on('click', (evt) => {
                populateTable();
            });

        $(this.filterListNode).addClass('filter-list');
    }

    addFilter(filter: LtFilter, index?: number, addEvents = true) {
        if (!(filter instanceof LtFilter)) {
            console.log('Object is not a filter!: ', filter);
            return;
        }
        if (index === undefined) index = this.filters.length;
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
            this.filterEvents.change(null); // new thing added, run change();
            filter.focus(); // focus on the newly added filter
        }
    }

    moveFilter(filter: LtFilter, direction: number) {
        let idx = this.filters.indexOf(filter);
        if (idx !== -1) {
            let newIdx = idx + direction;
            if (newIdx >= 0 && newIdx < this.filters.length) {
                this.removeFilter(filter, false);
                this.addFilter(filter, idx + direction, false);
            }
        }
    }

    removeFilter(filter: LtFilter, removeEvents = true) {
        this.filters = this.filters.filter(x => x !== filter);
        this.filterListNode.removeChild(filter.node);
        if (removeEvents) {
            filter.node.removeEventListener('change', this.filterEvents.change);
            filter.node.removeEventListener('move', this.filterEvents.move);
            filter.node.removeEventListener('delete', this.filterEvents.delete);
        }
    }

    filter(models: LtspiceModel[]) {
        if (this.filters.length === 0) return models;
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
        const DEF_MODEL_PARAMS = MODEL_TYPES_PARAMS[MTYPE] as i_defaultParamDefinition;

        let allModelTypes = COMMON_FILTERS();
        let specificModelType = (COMMON_FILTERS_BY_MODEL[MTYPE] || []).map(x => x());

        // For each parameter
        let byParameter = [] as i_filterDefinition[];
        for (const PARAM_KEY in PARAM_STATS) {
            let paramStats = PARAM_STATS[PARAM_KEY];
            let defParam = DEF_MODEL_PARAMS[PARAM_KEY];
            let description = (defParam) ? defParam.description : '';

            let paramDefOut = (paramStats.strSet.size) ? '' : NaN;
            let paramType = (paramStats.strSet.size) ? 'string' : 'number';
            let descStr = PARAM_KEY.bold();
            if (description !== '') descStr += description;

            let filter = new LtFilter(
                paramType as any,
                (model: LtspiceModel) => {
                    let a = model.getParam(PARAM_KEY, CURR_MODELS);
                    if (a && a.v && a.v && a.v.v && a.v.v.valueOf) return a.v.v.valueOf()
                    else return paramDefOut;
                },
                descStr,
                (paramType === 'string') ? '' : parseLtspiceNumber(paramStats.avg.toPrecision(4)).toString(),
                (paramType === 'string') ? '' : parseLtspiceNumber(paramStats.std.toPrecision(4)).toString(),
            )

            byParameter.push({
                name: PARAM_KEY,
                description,
                filter,
                count: paramStats.count,
            })
        }
        byParameter.sort((a, b) => (b.count - a.count));

        let extraSpecific = [];
        if (MTYPE === 'D') {
            let selectors = {};
            for (let diodeType of [...APP.paramStatsByModelType['D']['type'].strSet]) {
                selectors[diodeType.toLowerCase()] = {
                    fn: (filter: LtFilter) => {
                        return (x: string) => {
                            return x === diodeType;
                        };
                    },
                    display: diodeType,
                }
            }
            let filter = new LtFilter(
                selectors,
                x => x.getType(),
                'Diode Type'
            );
            extraSpecific.push({
                name: 'Diode Type',
                description: 'Type of diode (Silicon, Zener, LED...)',
                filter,
            });
        }

        return [
            ...extraSpecific,
            ...specificModelType,
            ...allModelTypes,
            ...byParameter,
        ] as i_filterDefinition[]
    }
}
//#endregion

interface i_filterDefWithNode extends i_filterDefinition {
    domNode: HTMLElement,
    nameLC: string,
    descriptionLC: string,
}

class FilterDropdownListManager {
    fm: LtFilterManager;
    node = document.createElement('div');
    txtInput = document.createElement('input');
    txt = '';
    listNode = document.createElement('div');
    avail: i_filterDefWithNode[] = [];

    constructor(fm: LtFilterManager) {
        this.fm = fm;
        this.txtInput.addEventListener('input', (evt) => {
            this.txt = (evt.target as HTMLInputElement).value;
            this.updateFilterDefinition();
        });

        $(this.node)
            .addClass(['filter-list-add', 'hidden'])
            .append(this.txtInput)
            .append(this.listNode)
    }

    updateFilterDefinition(newFilterDefinitions?: i_filterDefinition[]) {
        // Add and create nodes for each filter definition.
        if (newFilterDefinitions) {
            const filterMapper = (x: i_filterDefinition): i_filterDefWithNode => {
                let b = document.createElement('div');
                $(b)
                    .addClass('filter-add-element')
                    .append($(`<span class='filter-ae-title'>${x.name}</span>`))
                    .append($(`<span class='filter-ae-description'>${x.description}</span>`))
                    .on('click', () => {
                        this.fm.addFilter(x.filter);
                        this.node.classList.add('hidden');
                    })
                return {
                    ...x,
                    domNode: b,
                    nameLC: x.name.toLowerCase(),
                    descriptionLC: x.description.toLowerCase(),
                };
            };
            this.avail = newFilterDefinitions.map(filterMapper)
        }

        // Clear node
        let t = this.txt.toLowerCase();
        const getMatchIndexN = (x: i_filterDefWithNode) => {
            let m1 = x.nameLC.match(t);
            let c = (x.count === undefined) ? 1e4 : x.count;
            if (m1) return c + 1 - m1.index / x.nameLC.length;
            else return 0;
        }
        const getMatchIndexD = (x: i_filterDefWithNode) => {
            let m1 = x.descriptionLC.match(t);
            if (m1) return t.length / x.nameLC.length;
            else return 0;
        }
        const a = this.avail
            .filter(x => {
                return !this.fm.filters.includes(x.filter) && (
                    x.nameLC.includes(t) ||
                    x.descriptionLC.includes(t))
            })
            .sort(
                (a, b) =>
                    genericSort(getMatchIndexN(b), getMatchIndexN(a)) ||
                    genericSort(getMatchIndexD(b), getMatchIndexD(a))
            );

        while (this.listNode.firstChild) {
            this.listNode.removeChild(this.listNode.firstChild);
        }

        for (let f of a) this.listNode.appendChild(f.domNode);
    }
}

function createDialog() {
    const container = $('<div class="fullscreen padded dialog-container"></div>')
        .appendTo(document.body)
        .trigger('focus')
        .on('click', (evt) => {
            if (evt.target.classList.contains('dialog-container'))
                $(container).remove()
        })
        .get()[0]

    const dialog = $('<div class="dialog"></div>')
        .appendTo(container)
        .get()[0]

    return { container, dialog }
}

$(document)
    .on('keyup', (evt) => {
        if (evt.key === 'Escape') {
            $('.dialog-container').last().remove()
        }
    })

function showModelDetails(model: LtspiceModel) {
    const { dialog } = createDialog();

    $(dialog).append(
        $(`<h1></h1>`)
            .append(CreateSpecialNode.library(model.src.pack.logo))
            .append(`<span> ${model.modName}</span>`)
    )

    // Model
    $('<h2>Model: </h2>').appendTo(dialog);
    if (model.isAko) {
        $(`<span class="explanatory"></span>`)
            .append($(`<span>Model ${model.modName} is an alias of </span>`))
            .append(CreateSpecialNode.modelName(APP.modelsByName[model.akoBaseModel][0]))
            .append($('<span>.</span>'))
            .appendTo(dialog)
    }
    const modelBox = $('<pre class="model-box"></pre>')
        .appendTo(dialog)
        .text(model.getModelDirective())

    var isShowingOriginal = false;
    const getModelText = () => (isShowingOriginal) ? model.src.line : model.getModelDirective();

    $('<button class="btn">Show original</button>')
        .on('click', (evt) => {
            modelBox.text(getModelText())
            $(evt.target).text((isShowingOriginal) ? 'Show parsed' : 'Show original');
            isShowingOriginal = !isShowingOriginal;
        })
        .appendTo(dialog);

    $('<button class="btn">Break lines</button>')
        .on('click', (evt) => {
            let limitStr = prompt('Number of characters: ', '60'),
                limit = parseFloat(limitStr);
            if (isNaN(limit)) return;

            let t = getModelText().split(' '),
                counter = 0,
                joint = '\n + ',
                o = [],
                nl = [];

            for (let word of t) {
                counter += word.length + 1;
                if (counter > limit) {
                    o.push(nl);
                    nl = [];
                    counter = joint.length;
                }
                nl.push(word);
            }
            if (nl.length) o.push(nl);
            modelBox.text(o.map(x => x.join(' ')).join('\n + '))
        })
        .appendTo(dialog);
    $('<button class="btn">Copy</button>')
        .on('click', (evt) => {
            let t = modelBox.text();
            navigator.clipboard.writeText(t);
        })
        .appendTo(dialog);


    // Properties table
    $('<h2>Properties: </h2>').appendTo(dialog);
    const createDef = (key: string, val: string) => {
        return $('<tr></tr>')
            .append(`<td>${key}</td>`)
            .append(`<td>${val}</td>`)
    }
    const CURR_MODELS = APP.modelsByTypeByName[APP.mode]

    const propTable = $('<table></table>')
        .appendTo(
            $('<div class="table-container"></div>')
                .appendTo(dialog)
                .css('margin-bottom', '2em')
        )
        .append(
            createDef(
                '[Type]'.bold(),
                model.getType(CURR_MODELS)
            )
        )

    let a1 = Object.keys(model.params),
        a2 = DEFAULT_PARAMETERS[MODEL_TYPE_TO_GENERAL_TYPE(model.type)] as string[],
        a3p = DEFAULT_MODELS[model.type] as i_defaultParamDefinition,
        a3 = Object.keys(a3p).filter(x => a3p[x].default !== undefined);
    let paramsToShow = new Set([
        ...a1,
        ...a2,
        ...a3,
    ]);
    for (let param of paramsToShow) {
        let a = model.getParam(param, CURR_MODELS);
        if (a) {
            let x = `[${param}]`.bold();
            if (a.desc) x += '<br>' + a.desc;
            createDef(x, CreateSpecialNode.param(model, param).outerHTML)
                .appendTo(propTable)
        } else { console.log(param, model.getParam(param, CURR_MODELS)) }
    }
}



























//#region Unused?
/** Some file input function??? */
function readSingleFile(e: any) {
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
function displayContents(contents: string | ArrayBuffer) {
    if (contents) {
        var element = document.getElementById('file-content');
        element.textContent = contents.toString();
    }
}
//#endregion