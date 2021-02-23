import { parseLtspiceNumber } from "./Utils.js";
export class LtFilter {
    constructor(filterModes, modelPropGetter, description = '', val1 = '', val2 = '') {
        /** Parsed inputs. */
        this.inputs = {
            selector: null,
            val: null,
            valB: null,
        };
        // Events
        this.createEventChange = (mode = '') => {
            return new CustomEvent('change', {
                detail: Object.assign({ filter: this, mode }, this.inputs)
            });
        };
        this.createEventMove = (direction) => new CustomEvent('move', {
            detail: {
                filter: this,
                direction,
            }
        });
        this.createEventDelete = () => new CustomEvent('delete', {
            detail: {
                filter: this,
            }
        });
        this.evtSelectorUpdate = () => {
            this.inputs.selector = this.internalNodes.selector.value;
            // set values visibility & text;
            const csm = this.filterSelectorModes[this.inputs.selector];
            const { valContainer, valBContainer, val, valB, valDesc, valBDesc } = this.internalNodes;
            // I wish i used React on this project... but is too late to switch.
            if (csm.val) {
                valDesc.innerText = csm.val.description || '';
                valContainer.classList.remove('hidden');
            }
            else {
                valContainer.classList.add('hidden');
            }
            if (csm.valB) {
                valBDesc.innerText = csm.valB.description || '';
                valBContainer.classList.remove('hidden');
            }
            else {
                valBContainer.classList.add('hidden');
            }
            this.evtValUpdate();
            this.evtValBUpdate();
        };
        this.evtValUpdate = () => {
            var _a;
            let key = this.inputs.selector, validator = (_a = this.filterSelectorModes[key].val) === null || _a === void 0 ? void 0 : _a.validator;
            if (validator) {
                let x = validator(this.internalNodes.val.value);
                if (x) {
                    this.internalNodes.val.classList.remove('invalid');
                    this.internalNodes.val.value = x.str;
                    this.inputs.val = x.val;
                }
                else {
                    this.internalNodes.val.classList.add('invalid');
                }
            }
            else {
                //this.internalNodes.val.value = '';
                this.inputs.val = null;
            }
        };
        this.evtValBUpdate = () => {
            var _a;
            let key = this.inputs.selector, validator = (_a = this.filterSelectorModes[key].valB) === null || _a === void 0 ? void 0 : _a.validator;
            if (validator) {
                let x = validator(this.internalNodes.valB.value);
                if (x) {
                    this.internalNodes.valB.classList.remove('invalid');
                    this.internalNodes.valB.value = x.str;
                    this.inputs.valB = x.val;
                }
                else {
                    this.internalNodes.valB.classList.add('invalid');
                }
            }
            else {
                //this.internalNodes.valB.value = '';
                this.inputs.valB = null;
            }
        };
        this.modelPropGetter = modelPropGetter;
        this.node = document.createElement('div');
        this.node.classList.add('filter-container');
        this.internalNodes = {
            description: document.createElement('div'),
            selector: document.createElement('select'),
            valContainer: document.createElement('div'),
            valDesc: document.createElement('label'),
            val: document.createElement('input'),
            valBContainer: document.createElement('div'),
            valB: document.createElement('input'),
            valBDesc: document.createElement('label'),
            btnContainer: document.createElement('div'),
            btnUp: document.createElement('button'),
            btnDown: document.createElement('button'),
            btnDelete: document.createElement('button'),
        };
        let IN = this.internalNodes;
        IN.val.value = val1;
        IN.valB.value = val2;
        $(this.node)
            .append($(IN.description).addClass('filter-description'))
            .append($(IN.selector).addClass('filter-selector'))
            .append($(IN.valContainer)
            .append(IN.valDesc)
            .append(IN.val)
            .addClass('filter-input-container'))
            .append($(IN.valBContainer)
            .append(IN.valBDesc)
            .append(IN.valB)
            .addClass('filter-input-container'))
            .append($(IN.btnContainer)
            .append($(IN.btnDelete).addClass('btn').text('×'))
            .append($(IN.btnUp).addClass('btn').text('▴'))
            .append($(IN.btnDown).addClass('btn').text('▾'))
            .addClass('btn-container'));
        // Add event listeners and other parameters.
        IN.description.innerHTML = description.split('\n').join('<br>');
        if (filterModes === 'number') {
            this.filterSelectorModes = Object.assign({}, DEFAULT_SELECTOR_FN_NUMBER);
        }
        else if (filterModes === 'string') {
            this.filterSelectorModes = Object.assign({}, DEFAULT_SELECTOR_FN_STRING);
        }
        else {
            this.filterSelectorModes = Object.assign({}, filterModes);
        }
        IN.selector
            .addEventListener('change', this.evtSelectorUpdate);
        // Calling the custom event this way, instead of inside each evt-x-Update()
        // avoids having duplicate events.
        IN.selector
            .addEventListener('change', () => this.node.dispatchEvent(this.createEventChange('change')), false);
        IN.val
            .addEventListener('change', this.evtValUpdate);
        IN.val
            .addEventListener('change', () => this.node.dispatchEvent(this.createEventChange('change')), false);
        IN.val
            .addEventListener('input', this.evtValUpdate);
        IN.val
            .addEventListener('input', () => this.node.dispatchEvent(this.createEventChange('input')), false);
        IN.valB
            .addEventListener('change', this.evtValBUpdate);
        IN.valB
            .addEventListener('change', () => this.node.dispatchEvent(this.createEventChange('change')), false);
        IN.valB
            .addEventListener('input', this.evtValBUpdate);
        IN.valB
            .addEventListener('input', () => this.node.dispatchEvent(this.createEventChange('input')), false);
        IN.btnUp
            .addEventListener('click', () => this.node.dispatchEvent(this.createEventMove(-1)), false);
        IN.btnDown
            .addEventListener('click', () => this.node.dispatchEvent(this.createEventMove(1)), false);
        IN.btnDelete
            .addEventListener('click', () => this.node.dispatchEvent(this.createEventDelete()), false);
        this.reloadSelectors();
    }
    /** Returns the filter function */
    getFilter() {
        let x = this.inputs.selector, y = this.filterSelectorModes[x];
        if (y)
            return (model) => y.fn(this)(this.modelPropGetter(model));
        else
            return () => true;
    }
    selectorChange() {
        let newFilterKey = this.internalNodes.selector.value, newFilter = this.filterSelectorModes[newFilterKey];
        if (newFilter) {
            let { display, val, valB } = newFilter;
            this.inputs.selector = newFilterKey;
        }
    }
    /** Reloads selectors from this.filterFunctions */
    reloadSelectors() {
        let selector = this.internalNodes.selector;
        $(selector).empty();
        for (let key in this.filterSelectorModes) {
            let val = this.filterSelectorModes[key].display;
            let opt = document.createElement('option');
            opt.value = key;
            opt.innerText = val;
            selector.appendChild(opt);
        }
        selector.value = Object.keys(this.filterSelectorModes)[0];
        this.evtSelectorUpdate();
    }
    /** Focuses this filter's node. */
    focus() {
        const csm = this.filterSelectorModes[this.inputs.selector];
        let x = 'selector';
        if (csm.val) {
            x = 'val';
        }
        else if (csm.valB) {
            x = 'valB';
        }
        let y = this.internalNodes[x];
        y.focus();
        return y;
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
                val: { type: 'rel', val: x / 100 }
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
const DEFAULT_SELECTOR_FN_NUMBER = {
    '=': {
        fn: (filter) => {
            let { val, valB } = filter.inputs;
            let valMatch = val.valueOf(), valTol = (valB.type === 'abs') ? valB.val.valueOf() : valB.val;
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
            description: 'Tolerance (±|±%)',
            validator: LtFilter.toleranceValidator,
        },
    },
    '!=': {
        fn: (filter) => {
            let equalfn = filter.filterSelectorModes['='].fn(filter);
            return (x) => !equalfn(x);
        },
        display: '≠',
        val: {
            description: 'Not equal to',
            validator: LtFilter.ltspiceNumberValidator,
        },
        valB: {
            description: 'Tolerance (±|±%)',
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
    'range': {
        fn: (filter) => {
            let val = filter.inputs.val.valueOf();
            let valB = filter.inputs.valB.valueOf();
            return (x) => val <= x && x <= valB;
        },
        display: '[a,b]',
        val: {
            description: 'At least',
            validator: LtFilter.ltspiceNumberValidator,
        },
        valB: {
            description: 'At most',
            validator: LtFilter.ltspiceNumberValidator,
        },
    },
};
export const DEFAULT_SELECTOR_FN_STRING = {
    '=': {
        fn: (filter) => {
            let value = filter.inputs.val;
            return (x) => {
                return (x) ? x.toLowerCase().includes(value) : false;
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
            let equalfn = filter.filterSelectorModes['='].fn(filter);
            return (x) => !equalfn(x);
        },
        display: '≠',
        val: {
            description: 'Does not match',
            validator: LtFilter.stringCaseInsensitiveValidator,
        },
    },
};
export const COMMON_FILTERS = () => [
    {
        filter: new LtFilter('string', (x) => x.modName, 'Model name'),
        name: 'Model name',
        description: ' - ',
    },
];
export const COMMON_FILTERS_BY_MODEL = {
    BJT: [
        () => ({
            name: 'BJT type',
            description: 'NPN or PNP.',
            filter: new LtFilter({
                NPN: {
                    fn: (filter) => {
                        return (x) => {
                            return x === 'NPN';
                        };
                    },
                    display: 'NPN',
                },
                PNP: {
                    fn: (filter) => {
                        return (x) => {
                            return x === 'PNP';
                        };
                    },
                    display: 'PNP',
                },
            }, (model) => model.type, 'BJT type')
        }),
    ],
    D: [
    // {
    //     name: 'Diode type',
    //     description: 'Filter NPN or PNP',
    //     filter: new LtFilter(
    //         {
    //             Custom: {
    //                 fn: (filter: LtFilter) => {
    //                     return (x: string) => {
    //                         return x === 'NPN';
    //                     };
    //                 },
    //                 display: 'NPN',
    //             },
    //         },
    //         (model: LtspiceModel) => model.params.type?.v.value.toString(),
    //         'Diode type'
    //     )
    // }
    ],
    JFET: [
        () => ({
            name: 'Channel Type',
            description: 'JFET channel type (NJF or PJF)',
            filter: new LtFilter({
                nchan: {
                    fn: (filter) => {
                        return (x) => {
                            return x === 'NJF';
                        };
                    },
                    display: 'N-type channel',
                },
                pchan: {
                    fn: (filter) => {
                        return (x) => {
                            return x === 'PJF';
                        };
                    },
                    display: 'P-type channel',
                },
            }, (model) => model.type, 'Channel type')
        }),
    ],
    MOSFET: [
        () => ({
            name: 'Channel Type',
            description: 'MOSFET channel type (NMOS or PMOS)',
            filter: new LtFilter({
                nchan: {
                    fn: (filter) => {
                        return (x) => {
                            return x === 'nchan';
                        };
                    },
                    display: 'N-type channel',
                },
                pchan: {
                    fn: (filter) => {
                        return (x) => {
                            return x === 'pchan';
                        };
                    },
                    display: 'P-type channel',
                },
            }, (model) => model.mosChannel, 'Channel type')
        }),
    ],
};
//# sourceMappingURL=ltspiceModelFilter.js.map