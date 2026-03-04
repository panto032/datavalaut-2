const postalCodes: Record<string, string> = {
  "beograd": "11000", "novi sad": "21000", "niš": "18000", "kragujevac": "34000",
  "subotica": "24000", "zrenjanin": "23000", "pančevo": "26000", "čačak": "32000",
  "novi pazar": "36300", "kraljevo": "36000", "smederevo": "11300", "leskovac": "16000",
  "užice": "31000", "valjevo": "14000", "kruševac": "37000", "vranje": "17500",
  "šabac": "15000", "sombor": "25000", "požarevac": "12000", "pirot": "18300",
  "zaječar": "19000", "kikinda": "23300", "sremska mitrovica": "22000",
  "jagodina": "35000", "vršac": "26300", "bor": "19210", "prokuplje": "18400",
  "loznica": "15300", "priboj": "31330", "aranđelovac": "34300",
  "gornji milanovac": "32300", "paraćin": "35250", "bečej": "21220",
  "inđija": "22320", "stara pazova": "22300", "ruma": "22400",
  "temerin": "21235", "bačka palanka": "21400", "apatin": "25260",
  "ada": "24430", "titel": "21240", "kovačica": "26210",
  "aleksinac": "18220", "vrnjačka banja": "36210", "trstenik": "37240",
  "ćuprija": "35230", "svilajnac": "35210", "despotovac": "35213",
  "knjaževac": "19350", "negotin": "19300", "kladovo": "19320",
  "majdanpek": "19250", "petrovac na mlavi": "12300", "žagubica": "12320",
  "bajina bašta": "31250", "nova varoš": "31320", "ivanjica": "32250",
  "čajetina": "31310", "arilje": "31230", "kosjerić": "31260",
  "topola": "34310", "batočina": "34227", "knić": "34240",
  "lapovo": "34220", "rača": "34210",
  "vladičin han": "17510", "surdulica": "17530", "bosilegrad": "17540",
  "trgovište": "17525", "bujanovac": "17520", "preševo": "17523",
  "medveđa": "16240", "lebane": "16230", "vlasotince": "16210",
  "crna trava": "16215", "babušnica": "18330", "dimitrovgrad": "18320",
  "bela palanka": "18310", "gadžin han": "18314", "doljevac": "18410",
  "merošina": "18252", "svrljig": "18360", "sokobanja": "18230",
  "boljevac": "19370", "ražanj": "37215",
  "cicevac": "37210", "varvarin": "37260",
  "novi bečej": "23272", "žitište": "23210", "sečanj": "23240",
  "nova crnja": "23218", "čoka": "23320", "kanjiža": "24420",
  "mali iđoš": "24321", "srbobran": "21480", "vrbas": "21460",
  "kula": "25230", "odžaci": "25250",
  "bogatić": "15350", "vladimirci": "15225", "koceljeva": "15220",
  "mali zvornik": "15318", "ljubovija": "15320", "krupanj": "15314",
  "mionica": "14242", "ljig": "14240", "lajkovac": "14224",
  "ub": "14210", "osečina": "14253",
  "tutin": "36320", "sjenica": "36310", "raška": "36350",
  "brus": "37220", "aleksandrovac": "37230", "blace": "18420",
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

export function getPostalCode(mesto: string): string | null {
  const normalized = normalize(mesto);
  return postalCodes[normalized] ?? null;
}
