export function setWindow(key, value) {
    if (value === undefined && typeof (key) === 'object') {
        Object.entries(key).forEach(x => setWindow(x[0], x[1]));
    }
    else if (typeof (key) === 'string') {
        window[key] = value;
    }
}
export function getWindow(key) {
    return window[key];
}
export function arraysEqual(a, b) {
    if (a === b)
        return true;
    if (a == null || b == null)
        return false;
    if (a.length !== b.length)
        return false;
    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.
    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
}
export function toLtspiceNumber(n, uInsteadOfMu = false) {
    const suffix = ['f', 'p', 'n', (uInsteadOfMu ? 'u' : 'μ'), 'm', '', 'k', 'Meg', 'G', 'T'];
    const exp = Math.floor(Math.log10(Math.abs(n)) / 3);
    if (exp > 4 || exp < -5) {
        return n.toExponential();
    }
    else {
        // .toPrecision(15) === Magic number of digits without floating point error.
        return parseFloat((n / Math.pow(10, (exp * 3))).toPrecision(15)) + suffix[exp + 5];
    }
}
export function parseLtspiceNumber(str) {
    const a = new LtspiceNumber(str);
    if (a.value === undefined)
        return null;
    else
        return a;
}
export const LTSPICE_NUM_REGEX = /((?:[+-])?(?:[0-9]+(?:[.][0-9]*)?|[.][0-9]+))(e(?:[+-])?[0-9]+)?(meg|[kGTmμupf])?(\S+)?/i;
export class LtspiceNumber {
    constructor(str) {
        this.engexp = 1;
        this.engexpraw = undefined;
        this.suffix = null;
        if (str instanceof LtspiceNumber) {
            this.value = str.value;
            this.raw = str.raw;
            this.base = str.base;
            this.engexp = str.engexp;
            this.engexpraw = str.engexpraw;
            this.suffix = str.suffix;
            return;
        }
        if (typeof (str) === 'number') {
            this.value = str;
            this.raw = str.toString();
            this.base = str;
            return;
        }
        const m = str.match(LTSPICE_NUM_REGEX);
        if (!m)
            return null;
        const raw = m[0];
        const base = parseFloat(m[1] + (m[2] || ''));
        const engexp = (m[3]) ? LtspiceNumber.mults[m[3].toLowerCase()] : 1;
        // toPrecision(15) fixes floating point error (on eg: 2.74m)
        const value = parseFloat((base * engexp).toPrecision(15));
        this.value = value;
        this.raw = raw;
        this.base = base;
        this.engexp = engexp;
        this.engexpraw = m[3];
        this.suffix = m[4] || null;
        return;
    }
    toString(uInsteadOfMu = false) {
        return toLtspiceNumber(this.value, uInsteadOfMu);
    }
    valueOf() {
        return this.value;
    }
}
LtspiceNumber.mults = {
    k: 1e3,
    meg: 1e6,
    g: 1e9,
    t: 1e12,
    m: 1e-3,
    u: 1e-6,
    μ: 1e-6,
    n: 1e-9,
    p: 1e-12,
    f: 1e-15
};
export function createRadio(node, groupName = '', labelName = '', onchange = null, initialState = false) {
    let objId = labelName.toLowerCase().split(' ').join('_');
    let x = document.createElement('input');
    x.type = 'radio';
    x.name = groupName;
    x.id = objId;
    x.checked = initialState;
    x.addEventListener('change', onchange);
    node.appendChild(x);
    let l = document.createElement('label');
    l.innerText = labelName;
    l.htmlFor = objId;
    node.appendChild(l);
    return [x, l];
}
export function createElement(parentNode, tag = 'div', innerHTML = null, classes = []) {
    let x = document.createElement(tag);
    parentNode.appendChild(x);
    if (innerHTML !== null)
        x.innerHTML = innerHTML;
    classes.forEach((clss) => x.classList.add(clss));
    return x;
}
export function caseUnsensitiveProperty(obj, prop) {
    const keys = Object.keys(obj);
    const idx = keys.map(x => x.toLowerCase()).indexOf(prop.toLowerCase());
    if (idx !== -1) {
        let orgKey = keys[idx];
        return obj[orgKey];
    }
    return undefined;
}
export function runMethodIfExist(obj, exist, fn) {
    if (obj[exist] && typeof (obj[exist][fn]) === 'function')
        obj[exist] = obj[exist][fn]();
}
//# sourceMappingURL=Utils.js.map