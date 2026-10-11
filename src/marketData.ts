// @ts-nocheck
// A fixed visual snapshot of the reference market catalogue. These figures are
// illustrative; this prototype does not read an oracle or lending contracts.
const equityCounts = {
  AAPL:15, AMD:3, AMZN:3, ASML:2, BABA:2, CLSK:1, COIN:2, CRCL:4,
  CRWV:2, DELL:3, EWY:2, GME:3, GOOGL:12, INTC:3, IONQ:1, META:3,
  MSFT:5, MSTR:2, MU:4, NBIS:1, NVDA:17, ORCL:2, PLTR:2, QQQ:7,
  RGTI:2, RKLB:1, SGOV:4, SLV:3, SNDK:3, SPCX:8, SPY:13, TSLA:12,
  TSM:4, USAR:2, USO:3,
};

const otherCounts = {
  AI:4, AMC:1, BIGTECH:1, BLUECHIP:1, BOW:1, BUN:1, CASHCAT:6,
  COST:2, DELTA:1, DJT:1, E20M:2, ETH:1, F:1, GLD:1, HIMS:2, HMM:1,
  IBM:1, Index:2, LLY:1, LULU:1, MDLP:9, MRNA:1, NFLX:3,
  NOTHING:2, ORBIO:1, ORBIT:8, PONS:7, RBLX:2, RDDT:2, RIVN:1,
  SHROOM:1, STEERUV417:2, STONKBROKER:3, TTWO:1, UBIK:1, USDG:19,
  USDe:3, VBILL:1, VMAG:1, WETH:9, ZZZ:1, bCOIN:2, bGME:2,
  bMSTR:2, bNVDA:2, bPLTR:2, bQQQ:2, bSPCX:2, bSPY:2, bTSLA:2,
  cUSDG:8, cbBTC:1, csWETH:1, lAI:1, lCASHCAT:1, lDELTA:1,
  lIndex:1, lNOVAAI:1, lPONS:1, lWALLET:1, mBAL:1, mDEF:1, mGLO:1,
  nnUSDG:2, 'pSPY-DEC27':1, 'pSPY-MAR27':1,
  'scV3-AAPL-WETH-W':1, 'scV3-CRCL-USDG-U':1,
  'scV3-GOOGL-USDG-U':1, 'scV3-META-USDG-U':1,
  'scV3-SPCX-USDG-U':1, 'scV3-SPY-USDG-S':1,
  'scV3-SPY-USDG-U':1, 'scV3-USDG-NVDA':1,
  'scV3-USDG-NVDA-U':1, 'scV3-WETH-NVDA-W':1,
  'scV3-WETH-SPY-S':1, 'scV3-WETH-SPY-W':1,
  'scV3-WETH-USDG-U':1, 'scV3-WETH-USDG-W':1,
  'scV4-ETH-USDG-FR':1, 'scV4-SPCX-TSLA-U':1,
  'scV4-SPY-NVDA-S':1, 'scV4-SPY-QQQ-S':1,
  'scV4-SPY-QQQ-U':1, 'scV4-SPY-QQQ-USDG':1,
  'scV4-SPY-TSM-S':1, 'scV4-WETH-USDG-U':1,
  'scV4-WETH-USDG-W':1, spUSDG:2, steakUSDG:9,
  syrupUSDG:1, vUSDG:1, wSPCX:1, wsNET:2,
};

// The nonempty rows keep the reference's visible hierarchy on first load.
const featuredEquities = `
NVDA|62.5|687360|687360|31.97|31.97|1h 30m
SPCX|62.5|516380|516380|24.10|24.10|28m
GOOGL|62.5|260080|260080|20.58|20.58|31m
AAPL|62.5|197640|197640|21.04|21.04|1h 21m
TSLA|62.5|100000|0|0|0.78|57m
SPY|62.5|11230|5330|0.03|0.06|18h 07m
USAR|38.5|125.06|0|0|0.03|32m
CRWV|62.5|125|0|0|0.04|31m
NBIS|62.5|125|0|0|0.04|6m
SGOV|86|110.98|0|0|0.03|16h 38m
BABA|62.5|110.52|0|0|0.03|12m
RGTI|62.5|110.05|0|0|0.03|1h 31m
COIN|62.5|110|70|0.05|0.08|33m
SLV|62.5|102.5|13|0|0.04|2h 58m
GME|62.5|102.5|0|0|0.03|17m
DELL|62.5|102.5|0|0|0.03|9m
META|62.5|100.78|0|0|0.03|34m
INTC|62.5|100.68|5.4|0|0.03|20m
SNDK|62.5|100.68|3.51|0|0.03|34m
AMD|62.5|100.68|0|0|0.03|36m
MU|62.5|100.68|0|0|0.03|8m
MSTR|62.5|100|66|0.05|0.08|1h 08m
CRCL|62.5|100|45|0.03|0.06|2m
RKLB|62.5|100|0|0|0.04|1h 02m
EWY|62.5|100|0|0|0.05|3h 05m
CLSK|62.5|100|0|0|0.04|18m
TSM|62.5|100|0|0|0.03|1h 11m
ASML|62.5|100|0|0|0.03|14m
ORCL|62.5|100|0|0|0.03|1h 16m
IONQ|62.5|100|0|0|0.03|1h 32m
PLTR|62.5|33.07|30.07|2.46|2.71|1h 11m
QQQ|62.5|10|0|0|0.03|12h 38m
MSFT|62.5|5.01|5.01|6.37|6.37|43m
USO|62.5|2.5|0|0|0.03|1h 47m
AMZN|62.5|0|0|0.07|0.09|1h 41m
`.trim().split('\n').map(line=>{const [symbol,limit,supplied,borrowed,supplyAPY,borrowAPY,age]=line.split('|');return [symbol,'USDG',Number(limit),Number(supplied),Number(borrowed),Number(supplyAPY),Number(borrowAPY),age]});
const featuredOthers = [
  ['USDe','USDG',91.5,353810000,319910000,4.24,4.70,'…'],
  ['syrupUSDG','USDG',91.5,133870000,118370000,3.60,4.08,'…'],
  ['mGLO','USDG',91.5,32320000,29180000,4.96,5.50,'…'],
  ['spUSDG','USDG',91.5,9180000,8260000,2.72,3.03,'…'],
  ['wsNET','USDG',62.5,910250,815880,46.74,53.39,'…'],
  ['WETH','USDG',77,65260,18870,.01,.05,'…'],
  ['PONS','USDG',38.5,51550,39800,1.90,2.47,'…'],
  ['PONS','USDG',62.5,31080,28610,9.14,9.97,'…'],
  ['PONS','USDG',38.5,11390,4910,.03,.06,'…'],
  ['ORBIT','SPCX',91.5,10400,10400,87.5,87.5,'…'],
  ['pSPY-DEC27','USDG',62.5,10000,0,0,.09,'…'],
  ['STEERUV417','USDG',38.5,7210,7210,30.26,30.26,'…'],
];

const logoAliases = {steakUSDG:'https://cdn.morpho.org/v2/assets/images/steakhouse.svg'};
const morphoLogos = new Set('AAPL GOOGL META NVDA SPCX SPY TSLA AI CASHCAT PONS USDG USDe WETH mGLO spUSDG syrupUSDG'.split(' '));
export function tokenLogo(symbol) {
  if (logoAliases[symbol]) return logoAliases[symbol];
  if (morphoLogos.has(symbol)) return `https://cdn.morpho.org/assets/logos/${symbol.toLowerCase()}.svg`;
  return `https://chroma.credit/api/logo?s=${encodeURIComponent(symbol)}`;
}

function catalogue(counts, featured, category) {
  const seen = new Set();
  const rows = [];
  for (const row of featured) {
    if (seen.has(row[0])) continue;
    seen.add(row[0]);
    rows.push([row[0],row[1],row[3],row[4],row[5],row[6],row[7],category,row[2],`${category}-${row[0]}`]);
  }
  for (const symbol of Object.keys(counts)) {
    if (seen.has(symbol)) continue;
    const limit=symbol==='SGOV'||symbol.includes('USDG')?86:symbol==='USAR'?38.5:62.5;
    rows.push([symbol,'USDG',0,0,0,.03,'…',category,limit,`${category}-${symbol}`]);
  }
  return rows;
}

// The reference has many isolated pairs for a single ticker. This catalogue
// shows one representative pair per token so repeated identical rows do not
// dominate the design-only interface.
export const markets=[...catalogue(equityCounts,featuredEquities,'equity'),...catalogue(otherCounts,featuredOthers,'other')];
export const equityCount=Object.values(equityCounts).reduce((sum,n)=>sum+n,0);
export const equityAssets=Object.keys(equityCounts).length;
export const otherAssets=Object.keys(otherCounts).length;
