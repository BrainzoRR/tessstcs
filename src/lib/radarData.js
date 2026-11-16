// Normalized image coordinates. These callout regions support synthetic placement,
// not measured player positions or professional match data.
export const RADAR_ASSETS = {
  Mirage: { upper: "/radars/mirage.webp" }, Inferno: { upper: "/radars/inferno.webp" },
  Nuke: { upper: "/radars/nuke-upper.webp", lower: "/radars/nuke-lower.webp" },
  Overpass: { upper: "/radars/overpass.webp" }, Dust: { upper: "/radars/dust2.webp" },
  Ancient: { upper: "/radars/ancient.webp" }, Anubis: { upper: "/radars/anubis.webp" },
  Cache: { upper: "/radars/cache.webp" },
};
export const RADAR_MAP_ALIASES = {
  mirage: "Mirage", de_mirage: "Mirage", inferno: "Inferno", de_inferno: "Inferno",
  nuke: "Nuke", de_nuke: "Nuke", overpass: "Overpass", de_overpass: "Overpass",
  dust: "Dust", dust2: "Dust", "dust 2": "Dust", "dust ii": "Dust", de_dust2: "Dust",
  ancient: "Ancient", de_ancient: "Ancient", anubis: "Anubis", de_anubis: "Anubis",
  cache: "Cache", de_cache: "Cache",
};
export const RADAR_VIEWBOXES = {
  Mirage: { upper: { left: 0.08, top: 0.07, width: 0.84, height: 0.85 } },
  // Library extends to x=.96; the former right edge .94 clipped Library/Pit.
  Inferno: { upper: { left: 0.04, top: 0.03, width: 0.94, height: 0.92 } },
  Nuke: {
    upper: { left: 0.18, top: 0.16, width: 0.7, height: 0.62 },
    lower: { left: 0.38, top: 0.34, width: 0.34, height: 0.42 },
  },
  Overpass: { upper: { left: 0.09, top: 0.03, width: 0.79, height: 0.93 } },
  Dust: { upper: { left: 0.02, top: 0.03, width: 0.95, height: 0.91 } },
  Ancient: { upper: { left: 0.12, top: 0.09, width: 0.75, height: 0.79 } },
  Anubis: { upper: { left: 0.16, top: 0.05, width: 0.74, height: 0.91 } },
  Cache: { upper: { left: 0, top: 0, width: 1, height: 1 } },
};
export function radarRegion(x, y, width, height, level = "upper", space = "view") {
  return { x, y, width, height, level, space };
}
export function radarPoint(x, y, level = "upper", space = "view") {
  return radarRegion(x, y, 0.024, 0.024, level, space);
}
export function radarAnchors(points, level = "upper", space = "view", radius = 0.022) {
  return { anchors: points, radius, level, space };
}
export function radarPolygon(points, level = "upper", space = "absolute") {
  return { polygon: points, level, space };
}
export const RADAR_SITE_FALLBACKS = {
  Mirage: { A: radarAnchors([[.72,.49],[.77,.43],[.66,.58]]), B: radarAnchors([[.18,.57],[.24,.61],[.26,.52]]), Mid: radarAnchors([[.49,.68],[.5,.52],[.39,.54]]) },
  Inferno: { A: radarAnchors([[.72,.75],[.82,.78],[.61,.72]]), B: radarAnchors([[.2,.17],[.23,.23],[.22,.39]]), Mid: radarAnchors([[.47,.58],[.61,.56],[.52,.72]]) },
  Nuke: { A: radarAnchors([[.56,.46],[.62,.39],[.64,.57]]), B: radarAnchors([[.55,.46],[.49,.56],[.69,.59]], "lower"), Mid: radarAnchors([[.18,.55],[.79,.58],[.32,.54]]) },
  Overpass: { A: radarAnchors([[.77,.23],[.82,.31],[.65,.22]]), B: radarAnchors([[.24,.59],[.18,.74],[.37,.67]]), Mid: radarAnchors([[.54,.26],[.46,.46],[.66,.13]]) },
  Dust: { A: radarAnchors([[.8,.17],[.69,.27],[.12,.58]]), B: radarAnchors([[.12,.14],[.22,.14],[.34,.31]]), Mid: radarAnchors([[.5,.29],[.52,.39],[.39,.47]]) },
  Ancient: { A: radarAnchors([[.72,.38],[.39,.47],[.24,.7]]), B: radarAnchors([[.17,.22],[.24,.33],[.13,.31]]), Mid: radarAnchors([[.46,.53],[.47,.61],[.39,.47]]) },
  Anubis: { A: radarAnchors([[.24,.8],[.22,.56],[.36,.39]]), B: radarAnchors([[.84,.19],[.81,.19],[.73,.3]]), Mid: radarAnchors([[.46,.74],[.51,.53],[.57,.64]]) },
  Cache: {
    A: radarAnchors([[.315,.265],[.305,.285],[.33,.235]], "upper", "absolute"),
    B: radarAnchors([[.347,.81],[.32,.79],[.375,.825]], "upper", "absolute"),
    Mid: radarAnchors([[.575,.55],[.62,.53],[.54,.58]], "upper", "absolute"),
  },
};
export const RADAR_ZONE_POSITIONS = {
  Mirage: {
    "A ramp": radarAnchors([[.6,.79],[.63,.76]]), palace: radarAnchors([[.63,.16],[.6,.18]]),
    ticket: radarAnchors([[.79,.43],[.82,.41]]), jungle: radarAnchors([[.67,.53],[.7,.56]]),
    apartments: radarAnchors([[.23,.14],[.26,.17],[.28,.2]]), bench: radarAnchors([[.19,.6],[.22,.61]]),
    market: radarAnchors([[.29,.52],[.31,.55]]), van: radarAnchors([[.14,.56],[.16,.59]]),
    "top mid": radarAnchors([[.48,.69],[.52,.67]]), window: radarAnchors([[.49,.52],[.51,.5]]),
    connector: radarAnchors([[.6,.62],[.62,.65]]), catwalk: radarAnchors([[.35,.53],[.39,.53]]),
  },
  Inferno: {
    short: radarAnchors([[.59,.73],[.62,.7]]), library: radarAnchors([[.77,.66],[.79,.63]]), pit: radarAnchors([[.84,.79],[.81,.75]]),
    "site::A": radarAnchors([[.72,.76],[.75,.73]]), banana: radarAnchors([[.21,.46],[.23,.38],[.24,.3]]),
    coffins: radarAnchors([[.15,.12],[.18,.11]]), "new box": radarAnchors([[.22,.13],[.24,.16]]), dark: radarAnchors([[.14,.21],[.16,.24]]),
    mid: radarAnchors([[.47,.59],[.5,.56]]), arch: radarAnchors([[.61,.56],[.64,.54]]), boiler: radarAnchors([[.51,.71],[.54,.73]]), lane: radarAnchors([[.43,.73],[.46,.74]]),
  },
  Nuke: {
    outside: radarAnchors([[.17,.53],[.22,.57],[.28,.6]]), mini: radarAnchors([[.56,.5],[.54,.46]]), hut: radarAnchors([[.64,.57],[.63,.52]]), heaven: radarAnchors([[.61,.37],[.58,.34]]),
    ramp: radarAnchors([[.42,.57],[.44,.61]], "lower", "absolute"), fork: radarAnchors([[.47,.47],[.49,.49]], "lower", "absolute"),
    decon: radarAnchors([[.61,.5],[.63,.54]], "lower", "absolute"), "double doors": radarAnchors([[.47,.47],[.49,.49]], "lower", "absolute"),
    "site::B": radarAnchors([[.53,.57],[.55,.61]], "lower", "absolute"), garage: radarAnchors([[.08,.55],[.1,.58]]),
    secret: radarAnchors([[.66,.6],[.68,.67]], "lower", "absolute"), lobby: radarAnchors([[.79,.58],[.75,.56],[.83,.6]]),
  },
  Overpass: {
    long: radarAnchors([[.74,.22],[.77,.25]]), bathrooms: radarAnchors([[.63,.23],[.66,.22]]), truck: radarAnchors([[.82,.31],[.79,.33]]),
    "site::A": radarAnchors([[.79,.24],[.81,.28]]), monster: radarAnchors([[.17,.74],[.2,.69]]), "short::B": radarAnchors([[.37,.67],[.35,.63]]),
    pillar: radarAnchors([[.27,.64],[.24,.61]]), "site::B": radarAnchors([[.24,.59],[.28,.6]]), connector: radarAnchors([[.46,.46],[.43,.49]]),
    fountain: radarAnchors([[.54,.26],[.51,.26]]), party: radarAnchors([[.66,.13],[.69,.12]]), "short::Mid": radarAnchors([[.4,.54],[.37,.56]]),
  },
  Dust: {
    long: radarAnchors([[.12,.58],[.16,.62],[.19,.64]]), catwalk: radarAnchors([[.68,.26],[.64,.29]]), "A site": radarAnchors([[.8,.17],[.76,.17]]),
    "short::A": radarAnchors([[.69,.27],[.65,.3]]), tunnels: radarAnchors([[.21,.12],[.24,.14],[.27,.16]]), window: radarAnchors([[.2,.2],[.18,.18]]),
    "B site": radarAnchors([[.11,.14],[.13,.17],[.15,.13]]), door: radarAnchors([[.33,.31],[.36,.29]]), mid: radarAnchors([[.52,.39],[.48,.4]]),
    xbox: radarAnchors([[.59,.38],[.57,.36]]), "lower tunnels": radarAnchors([[.39,.47],[.36,.45]]), "top mid": radarAnchors([[.49,.29],[.53,.28]]),
  },
  Ancient: {
    "A main": radarAnchors([[.24,.7],[.26,.74]]), donut: radarAnchors([[.30,.455],[.315,.47]], "upper", "absolute"),
    temple: radarAnchors([[.72,.44],[.69,.42]]), "site::A": radarAnchors([[.73,.38],[.69,.37]]),
    cave: radarAnchors([[.63,.52],[.65,.515]], "upper", "absolute"), lane: radarAnchors([[.66,.405],[.66,.44]], "upper", "absolute"),
    "back site": radarAnchors([[.81,.4],[.815,.425]], "upper", "absolute"), ramp: radarAnchors([[.35,.31],[.38,.3]]),
    mid: radarAnchors([[.46,.53],[.49,.55]]), "red room": radarAnchors([[.475,.35],[.475,.39]], "upper", "absolute"), boost: radarAnchors([[.41,.47],[.43,.5]]),
  },
  Anubis: {
    "A main": radarAnchors([[.24,.8],[.28,.76]]), heaven: radarAnchors([[.28,.24],[.26,.28]]), "bridge::A": radarAnchors([[.36,.39],[.39,.41]]),
    "site::A": radarAnchors([[.22,.56],[.24,.6]]), canal: radarAnchors([[.7,.475],[.7,.53]], "upper", "absolute"), pillar: radarAnchors([[.73,.3],[.69,.31]]),
    "site::B": radarAnchors([[.81,.19],[.77,.18]]), "bridge::B": radarAnchors([[.66,.34],[.63,.36]]),
    mid: radarAnchors([[.54,.49],[.55,.46]], "upper", "absolute"), connector: radarAnchors([[.55,.44],[.52,.43]]), water: radarAnchors([[.57,.64],[.54,.67]]), "top mid": radarAnchors([[.46,.74],[.43,.71]]),
  },
  // Calibrated against public/radars/cache.webp (1000 x 1000), not the
  // differently rotated labeled JPG previously described in App.jsx.
  Cache: {
    "site::A": radarAnchors([[.315,.265],[.305,.285],[.33,.235]], "upper", "absolute"),
    quad: radarAnchors([[.31,.185],[.345,.185]], "upper", "absolute"),
    forklift: radarAnchors([[.405,.32],[.385,.32]], "upper", "absolute"),
    sandbags: radarAnchors([[.46,.35],[.46,.375]], "upper", "absolute"),
    highway: radarAnchors([[.315,.39],[.315,.44]], "upper", "absolute"),
    "A main": radarAnchors([[.47,.275],[.475,.315]], "upper", "absolute"),
    squeaky: radarAnchors([[.545,.25],[.56,.265]], "upper", "absolute"),
    "site::B": radarAnchors([[.347,.81],[.32,.79],[.375,.825]], "upper", "absolute"),
    toxic: radarAnchors([[.29,.835],[.29,.805]], "upper", "absolute"),
    checkers: radarAnchors([[.27,.685],[.29,.70]], "upper", "absolute"),
    "B halls": radarAnchors([[.45,.72],[.48,.73]], "upper", "absolute"),
    "z-connector": radarAnchors([[.34,.53],[.37,.53]], "upper", "absolute"),
    mid: radarAnchors([[.575,.55],[.62,.53],[.54,.58]], "upper", "absolute"),
    vents: radarAnchors([[.545,.635],[.565,.635]], "upper", "absolute"),
  },
};
export const RADAR_ZONE_ALIASES = {
  Mirage: { "a ramp": "A Ramp", palace: "Palace", "a site": "A Site", "b site": "B Site", ticket: "Ticket Booth", "ticket booth": "Ticket Booth", jungle: "Jungle", apartments: "B Apartments", "b apartments": "B Apartments", bench: "Bench", market: "Market", van: "Van", mid: "Mid", "top mid": "Top Mid", window: "Sniper's Nest", connector: "Connector", catwalk: "Catwalk", "site::a": "A Site", "site::b": "B Site", "site::mid": "Mid" },
  Inferno: { short: "A Short", library: "Library", pit: "Pit", "a site": "A Site", "b site": "B Site", banana: "Banana", coffins: "Coffins", "new box": "Quad", dark: "Dark", mid: "Mid", arch: "Arch", boiler: "Boiler", lane: "Patio", "site::a": "A Site", "site::b": "B Site", "site::mid": "Mid" },
  Nuke: { outside: "Outside", garage: "Garage", lobby: "Lobby", mini: "Mini", hut: "Hut", heaven: "Heaven", secret: "Secret", ramp: "Ramp", fork: "Fork", decon: "Decon", "double doors": "Fork", doors: "Doors", "b site": "B Site", "a site": "A Site", "site::a": "A Site", "site::b": "B Site", main: "Main" },
  Dust: { long: "A Long", catwalk: "Catwalk", "a site": "A Default Plant", "short::a": "A Short", tunnels: "Upper B Tunnels", "upper tunnels": "Upper B Tunnels", "lower tunnels": "Lower B Tunnels", window: "B Window", "b site": "B Default Plant", "b doors": "B Doors", door: "B Doors", doors: "B Doors", mid: "Mid", xbox: "Xbox", "top mid": "Top Mid", "site::a": "A Default Plant", "site::b": "B Default Plant", "site::mid": "Mid" },
  Overpass: { long: "A Long", bathrooms: "Toilets", "a site": "A Site", "b site": "B Site", truck: "Van", monster: "Monster", "short::b": "B Short", pillar: "Pillar", connector: "Connector", fountain: "Fountain", party: "Party", "short::mid": "A Short", "site::a": "A Site", "site::b": "B Site" },
  Ancient: { "a main": "A Main", donut: "Donut", temple: "Temple", cave: "Cave", lane: "Lane", "back site": "Back Site", "red room": "Red Room", ramp: "Ramp", mid: "Mid", boost: "Boost", water: "Water", heaven: "Heaven", doors: "Doors", "site::a": "A Site", "site::b": "B Site" },
  Anubis: { "top mid": "Top Mid", water: "Water", pillar: "Pillar", "a main": "Main", main: "Main", canal: "Canal", mid: "Mid", connector: "A Connector", "a connector": "A Connector", heaven: "Heaven", "bridge::a": "Bridge", "bridge::b": "Bridge", bridge: "Bridge", "site::a": "A Site", "site::b": "B Site" },
  Cache: { "a main": "A Main", main: "A Main", squeaky: "Squeaky", highway: "Highway", quad: "Quad", mid: "Mid", vents: "Vents", "z-connector": "Z-Connector", "z connector": "Z-Connector", checkers: "Checkers", "b halls": "B Halls", halls: "B Halls", toxic: "Toxic", forklift: "Forklift", sandbags: "Sandbags", "site::a": "A Site", "site::b": "B Site" },
};
export const RADAR_ZONE_POLYGONS = {
  Mirage: {
    "A Ramp": radarPolygon([[0.675,0.675],[0.7775,0.6737],[0.7837,0.55],[0.7412,0.55],[0.74,0.6075],[0.67,0.6088]]),
    Palace: radarPolygon([[0.6262,0.8037],[0.8462,0.8075],[0.8438,0.6837],[0.9113,0.6],[0.81,0.6025],[0.8075,0.7137],[0.685,0.715],[0.6875,0.7612],[0.6275,0.7612]]),
    "Ticket Booth": radarPolygon([[0.46,0.7937],[0.4838,0.8325],[0.4675,0.86],[0.4113,0.8325]]),
    Jungle: radarPolygon([[0.3762,0.6425],[0.49,0.6525],[0.485,0.5813],[0.3688,0.5713]]),
    "B Apartments": radarPolygon([[0.2225,0.2062],[0.3987,0.2087],[0.4012,0.2675],[0.44,0.27],[0.4437,0.17],[0.22,0.1625]]),
    Bench: radarPolygon([[0.1037,0.3212],[0.1638,0.3237],[0.1737,0.2213],[0.1013,0.2238]]),
    Market: radarPolygon([[0.1688,0.4725],[0.335,0.48],[0.33,0.4275],[0.2813,0.4288],[0.2725,0.3887],[0.1663,0.3875]]),
    Van: radarPolygon([[0.16,0.2188],[0.2213,0.215],[0.2162,0.165],[0.1663,0.1725]]),
    Mid: radarPolygon([[0.4462,0.385],[0.7388,0.3812],[0.735,0.52],[0.5537,0.5162],[0.5537,0.49],[0.44,0.4963]]),
    "Top Mid": radarPolygon([[0.6412,0.525],[0.7412,0.5275],[0.7412,0.3625],[0.6138,0.3575]]),
    "Sniper's Nest": radarPolygon([[0.3713,0.545],[0.4175,0.5525],[0.4188,0.44],[0.385,0.44]]),
    Connector: radarPolygon([[0.4688,0.585],[0.5375,0.59],[0.5337,0.4925],[0.4688,0.4938]]),
    Catwalk: radarPolygon([[0.45,0.4375],[0.6713,0.4375],[0.6737,0.39],[0.4487,0.3887]]),
    "A Site": radarPolygon([[0.475,0.8363],[0.6125,0.8125],[0.625,0.725],[0.4725,0.74]]),
    "B Site": radarPolygon([[0.1837,0.33],[0.2725,0.3337],[0.2787,0.24],[0.1837,0.24]]),
  },
  Inferno: {
    "A Short": radarPolygon([[0.6825,0.7937],[0.8237,0.7975],[0.8237,0.7375],[0.7212,0.7388],[0.7238,0.6875],[0.6763,0.69]]),
    Library: radarPolygon([[0.9,0.565],[0.9575,0.565],[0.96,0.5062],[0.8988,0.505]]),
    Pit: radarPolygon([[0.8175,0.8037],[0.9,0.7675],[0.9437,0.77],[0.9575,0.8775],[0.8237,0.88]]),
    "A Site": radarPolygon([[0.7688,0.6275],[0.7712,0.735],[0.8413,0.7338],[0.8425,0.6225]]),
    Banana: radarPolygon([[0.3975,0.505],[0.3962,0.4838],[0.4925,0.3425],[0.5463,0.3463],[0.5475,0.3287],[0.6088,0.3287],[0.625,0.4125],[0.52,0.405],[0.475,0.4875],[0.4788,0.5337],[0.4575,0.56],[0.4275,0.56]]),
    Coffins: radarPolygon([[0.5062,0.1725],[0.5413,0.1775],[0.5387,0.1325],[0.505,0.1363]]),
    Quad: radarPolygon([[0.4138,0.2675],[0.45,0.27],[0.4537,0.235],[0.4138,0.2338]]),
    Dark: radarPolygon([[0.4,0.155],[0.45,0.1563],[0.45,0.1225],[0.39,0.1237]]),
    Mid: radarPolygon([[0.4213,0.6863],[0.675,0.69],[0.6737,0.6312],[0.4213,0.6288]]),
    Arch: radarPolygon([[0.765,0.5238],[0.7963,0.525],[0.7987,0.4525],[0.7625,0.4512]]),
    Boiler: radarPolygon([[0.6412,0.7212],[0.6825,0.7212],[0.6875,0.6875],[0.6425,0.6875]]),
    Patio: radarPolygon([[0.6787,0.795],[0.7238,0.8025],[0.7262,0.7612],[0.6813,0.7612]]),
    "B Site": radarPolygon([[0.4375,0.2675],[0.5313,0.2662],[0.5337,0.1688],[0.4387,0.1713]]),
  },
  Nuke: {
    Outside: radarPolygon([[0.4612,0.7075],[0.5925,0.7512],[0.6963,0.745],[0.6913,0.6238],[0.7612,0.6275],[0.76,0.5687],[0.71,0.575],[0.71,0.52],[0.6262,0.5188],[0.625,0.6175],[0.6038,0.6188],[0.605,0.6525],[0.55,0.6525],[0.5513,0.6175],[0.5238,0.6188]]),
    "A Site": radarPolygon([[0.6212,0.44],[0.6262,0.6162],[0.5175,0.6138],[0.5212,0.445]]),
    Garage: radarPolygon([[0.6625,0.7013],[0.6937,0.6963],[0.6925,0.73],[0.7775,0.7338],[0.78,0.6262],[0.6613,0.6238]]),
    Lobby: radarPolygon([[0.4163,0.57],[0.5212,0.5687],[0.52,0.4975],[0.4475,0.4975],[0.4462,0.5138],[0.4163,0.5138]]),
    Main: radarPolygon([[0.5487,0.6538],[0.605,0.6538],[0.6025,0.6162],[0.5487,0.6175]]),
    Mini: radarPolygon([[0.626,0.545],[0.679,0.545],[0.679,0.614],[0.626,0.614]]),
    Hut: radarPolygon([[0.5262,0.5713],[0.5525,0.5713],[0.55,0.53],[0.5225,0.5313]]),
    Heaven: radarPolygon([[0.62,0.445],[0.6813,0.4437],[0.685,0.485],[0.6212,0.485]]),
    Ramp: radarPolygon([[0.39,0.51],[0.45,0.5],[0.47,0.57],[0.45,0.66],[0.4,0.66],[0.38,0.57]], "lower"),
    Fork: radarPolygon([[0.44,0.44],[0.5,0.44],[0.51,0.5],[0.45,0.52]], "lower"),
    Decon: radarPolygon([[0.59,0.45],[0.66,0.45],[0.66,0.57],[0.59,0.57]], "lower"),
    Doors: radarPolygon([[0.49,0.34],[0.57,0.34],[0.57,0.4],[0.49,0.4]], "lower"),
    "B Site": radarPolygon([[0.47,0.47],[0.59,0.47],[0.59,0.66],[0.47,0.66]], "lower"),
    Secret: radarPolygon([[0.63,0.52],[0.7,0.52],[0.7,0.73],[0.64,0.73]], "lower"),
  },
  Dust: {
    "A Long": radarPolygon([[0.8263,0.4263],[0.855,0.4375],[0.8325,0.4925],[0.91,0.4925],[0.9163,0.2838],[0.8225,0.275]]),
    Catwalk: radarPolygon([[0.4938,0.5925],[0.495,0.3787],[0.5238,0.3787],[0.5238,0.595]]),
    "A Default Plant": radarPolygon([[0.7887,0.1862],[0.83,0.1925],[0.8313,0.1437],[0.7825,0.1437]]),
    "A Short": radarPolygon([[0.6687,0.1625],[0.6675,0.425],[0.515,0.4213],[0.515,0.3725],[0.605,0.375],[0.6062,0.1575]]),
    "Upper B Tunnels": radarPolygon([[0.0675,0.5025],[0.2938,0.4938],[0.295,0.4338],[0.1862,0.4363],[0.1875,0.4025],[0.06,0.4075]]),
    "Lower B Tunnels": radarPolygon([[0.2813,0.4325],[0.4325,0.4375],[0.4363,0.3725],[0.2762,0.3775]]),
    "B Window": radarPolygon([[0.2462,0.15],[0.2787,0.15],[0.2762,0.11],[0.2437,0.1087]]),
    "B Default Plant": radarPolygon([[0.2275,0.1725],[0.2625,0.1787],[0.2737,0.1437],[0.2263,0.1437]]),
    "B Doors": radarPolygon([[0.2338,0.265],[0.2712,0.2662],[0.2712,0.2087],[0.2325,0.2062]]),
    Mid: radarPolygon([[0.435,0.5887],[0.4925,0.5887],[0.4938,0.4225],[0.4375,0.42]]),
    Xbox: radarPolygon([[0.4675,0.425],[0.4975,0.4275],[0.5012,0.3862],[0.455,0.385]]),
    "Top Mid": radarPolygon([[0.4562,0.6512],[0.5925,0.675],[0.6038,0.6025],[0.4437,0.6025]]),
  },
  Overpass: {
    "A Site": radarPolygon([[0.4175,0.22],[0.515,0.2625],[0.5725,0.2125],[0.4487,0.1563]]),
    "A Long": radarPolygon([[0.1563,0.6563],[0.1563,0.3887],[0.26,0.3312],[0.3212,0.2125],[0.365,0.2338],[0.305,0.3425],[0.3025,0.405],[0.2437,0.4113],[0.2425,0.5225],[0.2712,0.525],[0.27,0.7125],[0.305,0.7813],[0.2362,0.81]]),
    Connector: radarPolygon([[0.4775,0.5938],[0.5625,0.6],[0.5613,0.5575],[0.4888,0.5587]]),
    Party: radarPolygon([[0.3088,0.675],[0.3088,0.5262],[0.3638,0.5262],[0.3762,0.6887],[0.3287,0.7125]]),
    Fountain: radarPolygon([[0.4225,0.7312],[0.455,0.7175],[0.4525,0.6813],[0.42,0.6763],[0.3912,0.7087]]),
    Monster: radarPolygon([[0.795,0.4675],[0.7887,0.3875],[0.8425,0.3962],[0.8363,0.4625]]),
    "B Short": radarPolygon([[0.7037,0.425],[0.705,0.385],[0.7525,0.3862],[0.7512,0.4612],[0.685,0.4587]]),
    Pillar: radarPolygon([[0.715,0.3038],[0.7525,0.3075],[0.7562,0.3412],[0.7113,0.3387]]),
    "B Site": radarPolygon([[0.6675,0.3538],[0.7288,0.3538],[0.7225,0.2875],[0.6613,0.2938]]),
    Toilets: radarPolygon([[0.3987,0.4938],[0.425,0.4163],[0.385,0.3725],[0.3862,0.3463],[0.4313,0.3488],[0.4587,0.3713],[0.4637,0.49],[0.4313,0.525],[0.3912,0.525]]),
    Van: radarPolygon([[0.3663,0.1487],[0.4238,0.1563],[0.4288,0.135],[0.375,0.1275]]),
    "A Short": radarPolygon([[0.36,0.3113],[0.3875,0.265],[0.505,0.3262],[0.54,0.5112],[0.4925,0.5563],[0.4612,0.495],[0.4637,0.375],[0.4325,0.3475],[0.3638,0.345]]),
  },
  Ancient: {
    "A Main": radarPolygon([[0.125,0.38],[0.1275,0.4263],[0.2412,0.4238],[0.2412,0.3812]]),
    Temple: radarPolygon([[0.4425,0.1412],[0.4313,0.1412],[0.4263,0.1338],[0.3412,0.1363],[0.34,0.1713],[0.37,0.175],[0.3688,0.165],[0.3962,0.1675],[0.3962,0.1737],[0.4225,0.175],[0.4225,0.1663],[0.4412,0.165]]),
    "A Site": radarPolygon([[0.2662,0.235],[0.2612,0.2825],[0.3412,0.2838],[0.3412,0.235]]),
    Ramp: radarPolygon([[0.8025,0.475],[0.8325,0.4775],[0.8325,0.4975],[0.8475,0.5],[0.85,0.5975],[0.8063,0.5962]]),
    Mid: radarPolygon([[0.5238,0.5513],[0.425,0.55],[0.44,0.5288],[0.4412,0.49],[0.4238,0.47],[0.4225,0.4437],[0.5025,0.4437],[0.505,0.4838],[0.5225,0.4825]]),
    Water: radarPolygon([[0.6725,0.8413],[0.7212,0.8387],[0.7212,0.7462],[0.7275,0.735],[0.6725,0.7375]]),
    Boost: radarPolygon([[0.195,0.3237],[0.1975,0.3563],[0.2263,0.3563],[0.2263,0.3375],[0.2525,0.3375],[0.2487,0.325]]),
    "B Site": radarPolygon([[0.7025,0.38],[0.7037,0.4387],[0.78,0.435],[0.7837,0.4275],[0.79,0.42],[0.7925,0.4125],[0.7913,0.4012],[0.7837,0.3887],[0.77,0.3837]]),
    Heaven: radarPolygon([[0.5238,0.5513],[0.525,0.595],[0.5337,0.595],[0.5337,0.59],[0.5813,0.5913],[0.5875,0.5737],[0.5863,0.5537]]),
    Doors: radarPolygon([[0.77,0.5975],[0.8063,0.5988],[0.8013,0.6225],[0.7712,0.6225]]),
  },
  Anubis: {
    "Top Mid": radarPolygon([[0.4248,0.6465],[0.4238,0.6836],[0.4463,0.709],[0.4492,0.7031],[0.4932,0.7041],[0.5059,0.709],[0.5186,0.7041],[0.5352,0.708],[0.5439,0.7148],[0.5859,0.6758],[0.541,0.6748],[0.541,0.665],[0.5293,0.6641],[0.5293,0.6328],[0.4336,0.6318],[0.4336,0.6445]]),
    Water: radarPolygon([[0.4365,0.5625],[0.4385,0.6152],[0.46,0.6152],[0.46,0.6084],[0.4863,0.6074],[0.5205,0.6074],[0.5449,0.6084],[0.5439,0.6162],[0.5967,0.6172],[0.5967,0.6221],[0.6172,0.6211],[0.6191,0.5664],[0.5928,0.5645],[0.5928,0.5527],[0.5439,0.5508],[0.5439,0.5654],[0.5176,0.5654],[0.4863,0.5645],[0.4609,0.5645]]),
    Pillar: radarPolygon([[0.3623,0.543],[0.3623,0.5781],[0.2793,0.5781],[0.2588,0.5557],[0.2881,0.543]]),
    "B Site": radarPolygon([[0.3154,0.5264],[0.3633,0.5273],[0.3623,0.4824],[0.3389,0.459],[0.3145,0.459]]),
    Bridge: radarPolygon([[0.4951,0.4893],[0.4932,0.502],[0.4824,0.5039],[0.4795,0.5195],[0.4814,0.541],[0.4863,0.541],[0.4814,0.541],[0.4854,0.5654],[0.4814,0.5742],[0.4814,0.6016],[0.4863,0.6094],[0.4863,0.6299],[0.5166,0.6309],[0.5166,0.6074],[0.5234,0.6025],[0.5225,0.5674],[0.5166,0.5625],[0.5186,0.543],[0.5225,0.502],[0.5225,0.4893]]),
    "A Connector": radarPolygon([[0.5967,0.3701],[0.6045,0.3691],[0.6104,0.3623],[0.6504,0.3604],[0.6523,0.3672],[0.6592,0.3662],[0.6592,0.3896],[0.6533,0.3848],[0.6514,0.3926],[0.6172,0.3955],[0.6016,0.3936],[0.5967,0.3975]]),
    Main: radarPolygon([[0.7617,0.4688],[0.7783,0.4707],[0.7793,0.4756],[0.8213,0.4746],[0.8633,0.4316],[0.8633,0.3721],[0.8564,0.3711],[0.8555,0.3516],[0.8203,0.3506],[0.8213,0.3711],[0.8145,0.3711],[0.8145,0.4004],[0.7881,0.4023],[0.7881,0.4102],[0.8018,0.4102],[0.8018,0.4492],[0.7803,0.4492],[0.7627,0.4502]]),
    "A Site": radarPolygon([[0.7246,0.2188],[0.709,0.2266],[0.71,0.2334],[0.707,0.2393],[0.6992,0.2412],[0.6934,0.251],[0.6904,0.2607],[0.6895,0.2705],[0.6895,0.2793],[0.6953,0.291],[0.6914,0.2949],[0.6875,0.2988],[0.6875,0.3047],[0.707,0.3115],[0.7324,0.3096],[0.75,0.3066],[0.7607,0.3018],[0.7695,0.2939],[0.7793,0.2822],[0.7793,0.2676],[0.7822,0.2568],[0.7617,0.2246],[0.7432,0.2246]]),
    Heaven: radarPolygon([[0.2432,0.6533],[0.2793,0.6533],[0.2803,0.6787],[0.3311,0.7285],[0.3037,0.7471],[0.2422,0.6865]]),
  },
};
// Alias-only callouts use their calibrated anchor regions. They deliberately do
// not inherit the current event's site: a cave death is not a generic B-site death.
for (const map of Object.keys(RADAR_ZONE_POSITIONS)) {
  for (const [key, region] of Object.entries(RADAR_ZONE_POSITIONS[map])) {
    const label = RADAR_ZONE_ALIASES[map]?.[key.toLowerCase()];
    if (label && !RADAR_ZONE_POLYGONS[map]?.[label]) {
      (RADAR_ZONE_POLYGONS[map] ??= {})[label] = region;
    }
  }
}
