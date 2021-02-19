function extractTableData(table) {
    const rows = [...table.querySelectorAll('tr')];
    const headers = [...rows[0].querySelectorAll('td')].map(x => x.innerText.toLowerCase());
    const o = {};
    for (const row of rows.slice(1)) {
        const cells = [...row.querySelectorAll('td')].map(x => x.innerText);
        const so = Object.fromEntries(cells.slice(1).map(function (e, i) {
            return [headers.slice(1)[i], e];
        }));
        o[cells[0]] = so;
    }
    return o;
}
// Most of this info taken from http://ltwiki.org/ using extractTableData()
const NPN = {
    Is: {
        description: "Transport saturation current",
        units: "A",
        default: "1e-16"
    },
    Bf: {
        description: "Ideal maximum forward beta",
        units: "-",
        default: "100"
    },
    Nf: {
        description: "Forward current emission coefficient",
        units: "-",
        default: "1."
    },
    Vaf: {
        description: "Forward Early voltage",
        units: "V",
        default: "Infin."
    },
    Ikf: {
        description: "Corner for forward beta high current roll-off",
        units: "A",
        default: "Infin."
    },
    Ise: {
        description: "B-E leakage saturation current",
        units: "A",
        default: "0."
    },
    Ne: {
        description: "B-E leakage emission coefficient",
        units: "-",
        default: "1.5"
    },
    Br: {
        description: "Ideal maximum reverse beta",
        units: "-",
        default: "1."
    },
    Nr: {
        description: "Reverse current emission coefficient",
        units: "-",
        default: "1."
    },
    Var: {
        description: "Reverse Early voltage",
        units: "V",
        default: "Infin."
    },
    Ikr: {
        description: "Corner for reverse beta high current roll-off",
        units: "A",
        default: "Infin."
    },
    Isc: {
        description: "B-C leakage saturation current",
        units: "A",
        default: "0"
    },
    Nc: {
        description: "B-C leakage emission coefficient",
        units: "-",
        default: "2"
    },
    Rb: {
        description: "Zero-bias base resistance",
        units: "Ω",
        default: "0"
    },
    Irb: {
        description: "Current where base resistance falls halfway to its min value",
        units: "A",
        default: "Infin."
    },
    Rbm: {
        description: "Minimum base resistance at high currents",
        units: "Ω",
        default: "Rb"
    },
    Re: {
        description: "Emitter resistance",
        units: "Ω",
        default: "0."
    },
    Rc: {
        description: "Collector resistance",
        units: "Ω",
        default: "0."
    },
    Cje: {
        description: "B-E zero-bias depletion capacitance",
        units: "F",
        default: "0."
    },
    Vje: {
        description: "B-E built-in potential",
        units: "V",
        default: "0.75"
    },
    Mje: {
        description: "B-E junction exponential factor",
        units: "-",
        default: "0.33"
    },
    Tf: {
        description: "Ideal forward transit time",
        units: "sec",
        default: "0."
    },
    Xtf: {
        description: "Coefficient for bias dependence of Tf",
        units: "-",
        default: "0."
    },
    Vtf: {
        description: "Voltage describing Vbc dependence of Tf",
        units: "V",
        default: "Infin."
    },
    Itf: {
        description: "High-current parameter for effect on Tf",
        units: "A",
        default: "0."
    },
    Ptf: {
        description: "Excess phase at freq=1/(Tf*2*PI)Hz",
        units: "º",
        default: "0."
    },
    Cjc: {
        description: "B-C zero-bias depletion capacitance",
        units: "F",
        default: "0."
    },
    Vjc: {
        description: "B-C built-in potential",
        units: "V",
        default: "0.75"
    },
    Mjc: {
        description: "B-C junction exponential factor",
        units: "-",
        default: "0.33"
    },
    Xcjc: {
        description: "Fraction of B-C depletion capacitance connected to internal base node",
        units: "-",
        default: "1."
    },
    Tr: {
        description: "Ideal reverse transit time",
        units: "sec",
        default: "0."
    },
    Cjs: {
        description: "Zero-bias collector-substrate capacitance",
        units: "F",
        default: "0."
    },
    Vjs: {
        description: "Substrate junction built-in potential",
        units: "V",
        default: "0.75"
    },
    Mjs: {
        description: "Substrate junction exponential factor",
        units: "-",
        default: "0."
    },
    Xtb: {
        description: "Forward and reverse beta temperature exponent",
        units: "-",
        default: "0."
    },
    Eg: {
        description: "Energy gap for temperature effect on Is",
        units: "eV",
        default: "1.11"
    },
    Xti: {
        description: "Temperature exponent for effect on Is",
        units: "-",
        default: "3."
    },
    Kf: {
        description: "Flicker-noise coefficient",
        units: "-",
        default: "0."
    },
    Af: {
        description: "Flicker-noise exponent",
        units: "-",
        default: "1."
    },
    Fc: {
        description: "Coefficient for forward-bias depletion capacitance formula",
        units: "-",
        default: "0.5"
    },
    Tnom: {
        description: "Parameter measurement temperature",
        units: "ºC",
        default: "27"
    },
    Cn: {
        description: "Quasi-saturation temperature coefficient for hole mobility",
        units: "-",
        default: "2.42"
    },
    D: {
        description: "Quasi-saturation temperature coefficient for scattering-limited hole carrier velocity",
        units: "-",
        default: ".87"
    },
    Gamma: {
        description: "Epitaxial region doping factor",
        units: " ",
        default: "1e-11"
    },
    Qco: {
        description: "Epitaxial region charge factor",
        units: "Coul",
        default: "0."
    },
    Quasimod: {
        description: "Quasi-saturation flag for temperature dependence",
        units: "-",
        default: "(not set)"
    },
    Rco: {
        description: "Epitaxial region resistance",
        units: "Ω",
        default: "0."
    },
    Vg: {
        description: "Quasi-saturation extrapolated bandgap voltage at 0ºK",
        units: "V",
        default: "1.206"
    },
    Vo: {
        description: "Carrier mobility knee voltage",
        units: "V",
        default: "10."
    },
    Tre1: {
        description: "Re linear temperature coefficient",
        units: "1/ºC",
        default: "0."
    },
    Tre2: {
        description: "Re quadratic temperature coefficient",
        units: "1/ºC²",
        default: "0."
    },
    Trb1: {
        description: "Rb linear temperature coefficient",
        units: "1/ºC",
        default: "0."
    },
    Trb2: {
        description: "Rb quadratic temperature coefficient",
        units: "1/ºC²",
        default: "0."
    },
    Trc1: {
        description: "Rc linear temperature coefficient",
        units: "1/ºC",
        default: "0."
    },
    Trc2: {
        description: "Rc quadratic temperature coefficient",
        units: "1/ºC²",
        default: "0."
    },
    Trm1: {
        description: "Rmb linear temperature coefficient",
        units: "1/ºC",
        default: "0."
    },
    Trm2: {
        description: "Rmb quadratic temperature coefficient",
        units: "1/ºC²",
        default: "0."
    },
    Iss: {
        description: "Substrate junction saturation current",
        units: "A",
        default: "0."
    },
    Ns: {
        description: "Substrate junction emission Coefficient",
        units: "-",
        default: "1."
    }
};
const PNP = Object.assign(Object.assign({}, NPN), { Cn: Object.assign(Object.assign({}, NPN.Cn), { default: "2.2" }), D: Object.assign(Object.assign({}, NPN.D), { default: ".52" }) });
const D = {
    Ron: {
        description: "Resistance in forward conduction",
        units: "Ω",
        default: "1."
    },
    Roff: {
        description: "Resistance when off",
        units: "Ω",
        default: "1./Gmin"
    },
    Vfwd: {
        description: "Forward threshold voltage to enter conduction",
        units: "V",
        default: "0."
    },
    Vrev: {
        description: "Reverse breakdown voltage",
        units: "V",
        default: "Infin."
    },
    Rrev: {
        description: "Breakdown impedance",
        units: "Ω",
        default: "Ron"
    },
    Ilimit: {
        description: "Forward current limit",
        units: "A",
        default: "Infin."
    },
    RevIlimit: {
        description: "Reverse current limit",
        units: "A",
        default: "Infin."
    },
    Epsilon: {
        description: "Width of quadratic region",
        units: "V",
        default: "0."
    },
    RevEpsilon: {
        description: "Width of reverse quad. region",
        units: "V",
        default: "0."
    },
    Is: {
        description: "saturation current",
        units: "A",
        default: "1e-14",
        example: "1e-7"
    },
    Rs: {
        description: "Ohmic resistance",
        units: "Ω",
        default: "0.",
        example: "10."
    },
    N: {
        description: "Emission coefficient",
        units: "-",
        default: "1",
        example: "1."
    },
    Tt: {
        description: "Transit-time",
        units: "sec",
        default: "0.",
        example: "2n"
    },
    Cjo: {
        description: "Zero-bias junction cap.",
        units: "F",
        default: "0",
        example: "2p"
    },
    Vj: {
        description: "Junction potential",
        units: "V",
        default: "1.",
        example: ".6"
    },
    M: {
        description: "Grading coefficient",
        units: "-",
        default: "0.5",
        example: "0.5"
    },
    Eg: {
        description: "Activation energy",
        units: "eV",
        default: "1.11",
        example: "1.11 Si\n\n0.69 Sbd\n\n0.67 Ge"
    },
    Xti: {
        description: "Sat.-current temp. exp",
        units: "-",
        default: "3.0",
        example: "3.0 jn\n\n2.0 Sbd"
    },
    Kf: {
        description: "Flicker noise coeff.",
        units: "-",
        default: "0",
        example: " "
    },
    Af: {
        description: "Flicker noise exponent",
        units: "1",
        default: "1",
        example: " "
    },
    Fc: {
        description: "Coeff. for forward-bias depletion capacitance formula",
        units: "-",
        default: "0.5",
        example: " "
    },
    BV: {
        description: "Reverse breakdown voltage",
        units: "V",
        default: "Infin.",
        example: "40."
    },
    Ibv: {
        description: "Current at breakdown voltage",
        units: "A",
        default: "1e-10",
        example: " "
    },
    Tnom: {
        description: "Parameter measurement temp.",
        units: "ºC",
        default: "27",
        example: "50"
    },
    Isr: {
        description: "Recombination current parameter",
        units: "A",
        default: "0",
        example: " "
    },
    Nr: {
        description: "Isr emission coeff.",
        units: "-",
        default: "2",
        example: " "
    },
    Ikf: {
        description: "High-injection knee current",
        units: "A",
        default: "Infin.",
        example: " "
    },
    Tikf: {
        description: "Linear Ikf temp coeff.",
        units: "/ºC",
        default: "0",
        example: " "
    },
    Trs1: {
        description: "linear Rs temp coeff.",
        units: "/ºC",
        default: "0",
        example: " "
    },
    Trs2: {
        description: "Quadratic Rs temp coeff.",
        units: "/ºC/ºC",
        default: "0",
        example: " "
    },
    Vpk: {
        description: "Peak voltage rating",
        units: "V"
    },
    Ipk: {
        description: "Peak current rating",
        units: "A"
    },
    Iave: {
        description: "Ave current rating",
        units: "A"
    },
    Irms: {
        description: "RMS current rating",
        units: "A"
    },
    diss: {
        description: "Maximum power dissipation rating",
        units: "W"
    }
};
const NJF = {
    Vto: {
        description: "Threshold voltage",
        units: "V",
        default: "-2.0",
        example: "-2.0"
    },
    Beta: {
        description: "Transconductance parameter",
        units: "A/V/V",
        default: "1e-4",
        example: "1e-3"
    },
    Lambda: {
        description: "Channel-length modulation parameter",
        units: "1/V",
        default: "0",
        example: "1e-4"
    },
    Rd: {
        description: "Drain ohmic resistance",
        units: "Ω",
        default: "0.",
        example: "100"
    },
    Rs: {
        description: "Source ohmic resistance",
        units: "Ω",
        default: "0.",
        example: "100"
    },
    Cgs: {
        description: "Zero-bias G-S junction capacitance",
        units: "F",
        default: "0.",
        example: "5p"
    },
    Cgd: {
        description: "Zero-bias G-D junction capacitance",
        units: "F",
        default: "0.",
        example: "1p"
    },
    Pb: {
        description: "Gate junction potential",
        units: "V",
        default: "1.",
        example: "0.6"
    },
    Is: {
        description: "Gate junction saturation current",
        units: "A",
        default: "1e-14",
        example: "1e-14"
    },
    B: {
        description: "Doping tail parameter",
        units: "-",
        default: "1",
        example: "1.1"
    },
    KF: {
        description: "Flicker noise coefficient",
        units: "-",
        default: "0",
        example: " "
    },
    AF: {
        description: "Flicker noise exponent",
        units: "-",
        default: "1",
        example: " "
    },
    Fc: {
        description: "Coefficient for forward-depletion capacitance",
        units: "-",
        default: ".5",
        example: " "
    },
    Tnom: {
        description: "Parameter measurement temperature",
        units: "ºC",
        default: "27",
        example: "50"
    },
    BetaTce: {
        description: "Transconductance parameter exponential temperature coefficient",
        units: "%/ºC",
        default: "0",
        example: " "
    },
    VtoTc: {
        description: "Threshold voltage temperature coefficient",
        units: "V/ºC",
        default: "0",
        example: " "
    },
    N: {
        description: "Gate junction emission coefficient",
        units: "-",
        default: "1.",
        example: " "
    },
    Isr: {
        description: "Gate junction recombination current parameter",
        units: "A",
        default: "0.",
        example: " "
    },
    Nr: {
        description: "Emission coefficient for Isr",
        units: "-",
        default: "2",
        example: " "
    },
    alpha: {
        description: "Ionization coefficient",
        units: "1/V",
        default: "0",
        example: " "
    },
    Vk: {
        description: "Ionization knee voltage",
        units: "V",
        default: "0",
        example: " "
    },
    Xti: {
        description: "Saturation current temperature coefficient",
        units: "-",
        default: "3",
        example: " "
    }
};
const PJF = NJF;
const VDMOS = {
    Vto: {
        description: "Threshold voltage",
        units: "V",
        default: "0",
        example: "1.0"
    },
    Kp: {
        description: "Transconductance parameter",
        units: "A/V²",
        default: "1.",
        example: ".5"
    },
    Phi: {
        description: "Surface inversion potential",
        units: "V",
        default: "0.6",
        example: "0.65"
    },
    Lambda: {
        description: "Channel-length modulation",
        units: "1/V",
        default: "0.",
        example: "0.02"
    },
    mtriode: {
        description: "Conductance multiplier in triode region(allows independent fit of triode and saturation regions",
        units: "-",
        default: "1.",
        example: "2."
    },
    subtreas: {
        description: "Current(per volt Vds) to switch from square law to exponential subthreshold conduction",
        units: "A/V",
        default: "0.",
        example: "1n"
    },
    BV: {
        description: "Vds breakdown voltage",
        units: "V",
        default: "Infin.",
        example: "40"
    },
    IBV: {
        description: "Current at Vds=BV",
        units: "A",
        default: "100pA",
        example: "1u"
    },
    NBV: {
        description: "Vds breakdown emission coefficient",
        units: "-",
        default: "1.",
        example: "10"
    },
    Rd: {
        description: "Drain ohmic resistance",
        units: "Ω",
        default: "0.",
        example: "1."
    },
    Rs: {
        description: "Source ohmic resistance",
        units: "Ω",
        default: "0.",
        example: "1."
    },
    Rg: {
        description: "Gate ohmic resistance",
        units: "Ω",
        default: "0.",
        example: "2."
    },
    Rds: {
        description: "Drain-source shunt resistance",
        units: "Ω",
        default: "Infin.",
        example: "10Meg"
    },
    Rb: {
        description: "Body diode ohmic resistance",
        units: "Ω",
        default: "0.",
        example: ".5"
    },
    Cjo: {
        description: "Zero-bias body diode junction capacitance",
        units: "F",
        default: "0.",
        example: "1n"
    },
    Cgs: {
        description: "Gate-source capacitance",
        units: "F",
        default: "0.",
        example: "500p"
    },
    Cgdmin: {
        description: "Minimum non-linear G-D capacitance",
        units: "F",
        default: "0.",
        example: "300p"
    },
    Cgdmax: {
        description: "Maximum non-linear G-D capacitance",
        units: "F",
        default: "0.",
        example: "1000p"
    },
    A: {
        description: "Non-linear Cgd capacitance parameter",
        units: "-",
        default: "1.",
        example: ".5"
    },
    Is: {
        description: "Body diode saturation current",
        units: "A",
        default: "1e-14",
        example: "1e-15"
    },
    N: {
        description: "Bulk diode emission coefficient",
        units: "-",
        default: "1.",
        example: " "
    },
    Vj: {
        description: "Body diode junction potential",
        units: "V",
        default: "1.",
        example: "0.87"
    },
    M: {
        description: "Body diode grading coefficient",
        units: "-",
        default: "0.5",
        example: "0.5"
    },
    Fc: {
        description: "Body diode coefficient for forward-bias depletion capacitance formula",
        units: "-",
        default: "0.5",
        example: " "
    },
    tt: {
        description: "Body diode transit time",
        units: "sec",
        default: "0.",
        example: "10n"
    },
    Eg: {
        description: "Body diode activation energy for temperature effect on Is",
        units: "eV",
        default: "1.11",
        example: " "
    },
    Xti: {
        description: "Body diode saturation current temperature exponent",
        units: "-",
        default: "3.",
        example: " "
    },
    L: {
        description: "Length scaling",
        units: "-",
        default: "1.",
        example: " "
    },
    W: {
        description: "Width scaling",
        units: "-",
        default: "1.",
        example: " "
    },
    Kf: {
        description: "Flicker noise coefficient",
        units: "-",
        default: "0.",
        example: " "
    },
    Af: {
        description: "Flicker noise exponent",
        units: "-",
        default: "1.",
        example: " "
    },
    nchan: {
        description: "N-channel VDMOS (flag)",
        units: "-",
        default: "(true)",
        example: "-"
    },
    pchan: {
        description: "P-channel VDMOS (flag)",
        units: "-",
        default: "(false)",
        example: "-"
    },
    Tnom: {
        description: "Parameter measurement temperature",
        units: "ºC",
        default: "27",
        example: "50"
    },
    // Custom parameters: ignored by LTspice but useful for comparing
    Vds: {
        description: "Rated Drain-source voltage. Ignored by LTspice, but useful when comparing models.",
        units: "V",
    },
    Ron: {
        description: "On-state resistance. Ignored by LTspice, but useful when comparing models.",
        units: "V",
    },
    Qg: {
        description: "Gate charge. Ignored by LTspice, but useful when comparing models.",
        units: "C",
    },
};
const NMOS = VDMOS;
const PMOS = VDMOS;
export const DEFAULT_MODELS = {
    NPN,
    PNP,
    D,
    NJF,
    PJF,
    VDMOS,
    NMOS,
    PMOS,
};
//# sourceMappingURL=ltspiceDefaultModels.js.map