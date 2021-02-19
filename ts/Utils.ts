export function setWindow(key, value?) {
    if (value === undefined && typeof (key) === 'object') {
        Object.entries(key).forEach(x => setWindow(x[0], x[1]));
    } else if (typeof (key) === 'string') {
        (window as any)[key] = value;
    }
}
export function getWindow(key) {
    return (window as any)[key]
}

export function arraysEqual(a: any[], b: any[]) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export function toLtspiceNumber(n: number, uInsteadOfMu = false) {
    const suffix = ['f', 'p', 'n', (uInsteadOfMu ? 'u' : 'μ'), 'm', '', 'k', 'Meg', 'G', 'T'];
    const exp = Math.floor(Math.log10(Math.abs(n)) / 3);
    if (exp > 4 || exp < -5) {
        return n.toExponential();
    }
    else {
        // .toPrecision(15) === Magic number of digits without floating point error.
        return parseFloat((n / 10 ** (exp * 3)).toPrecision(15)) + suffix[exp + 5];
    }
}

export const LTSPICE_NUM_REGEX = /((?:[+-])?(?:[0-9]+(?:[.][0-9]*)?|[.][0-9]+))(e(?:[+-])?[0-9]+)?(meg|[kGTmμupf])?(\S+)?/i
export function parseLtspiceNumber(str: string) {
    const m = str.match(LTSPICE_NUM_REGEX);
    if (!m) return null;
    const raw = m[0];
    const base = parseFloat(m[1] + (m[2] || ''));
    const mults = {
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
    }
    const engexp: number = (m[3]) ? mults[m[3].toLowerCase()] : 1;
    // toPrecision(15) fixes floating point error (on eg: 2.74m)
    const value = parseFloat((base * engexp).toPrecision(15));
    return {
        value,
        raw,
        base,
        engexp,
        engexpraw: m[3],
        suffix: m[4] || null,
        toString: function () { return toLtspiceNumber(this.value); },
        valueOf: function () { return this.value; }
    }
}

export function createRadio(node: HTMLElement, groupName = '', labelName = '', onchange = null, initialState = false) {
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

export function createElement(
    parentNode: HTMLElement,
    tag = 'div',
    innerHTML = null,
    classes: string[] = []
) {
    let x = document.createElement(tag);
    parentNode.appendChild(x);
    if (innerHTML !== null) x.innerHTML = innerHTML;
    classes.forEach((clss) => x.classList.add(clss));
    return x;
}