'use strict';

// Builds the tracker workbook (tracker.xlsx): six sheets, real .xlsx formula
// cells (not pre-baked values), no
// macros. Hand-rolled XML over the minimal ZIP writer in ./zip.js -- see that
// file's header comment for why
// this is written by hand instead of pulling in a dependency.

const path = require('path');
const { ZipWriter } = require('./zip.js');
const { RIOT_DISCLAIMER, TRADEMARK_NOTICE } = require('../site.js');

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colLetter(index0) {
  let n = index0 + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function ref(colIndex0, rowNumber) {
  return `${colLetter(colIndex0)}${rowNumber}`;
}

// ---------------------------------------------------------------------------
// Shared strings pool (deduplicated, referenced by index from cells)
// ---------------------------------------------------------------------------

class SharedStrings {
  constructor() {
    this.list = [];
    this.map = new Map();
  }
  add(str) {
    if (this.map.has(str)) return this.map.get(str);
    const idx = this.list.length;
    this.list.push(str);
    this.map.set(str, idx);
    return idx;
  }
  toXml() {
    const count = this.list.length;
    const items = this.list
      .map(s => `<si><t xml:space="preserve">${escapeXml(s)}</t></si>`)
      .join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${count}" uniqueCount="${count}">${items}</sst>`;
  }
}

// ---------------------------------------------------------------------------
// Cell styles. Index into styles.xml's cellXfs -- see buildStylesXml() below,
// which must define exactly these indexes in this order.
// ---------------------------------------------------------------------------

const STYLE = {
  DEFAULT: 0,
  TITLE: 1,   // bold, 14pt
  HEADER: 2,  // bold, bottom border
  LABEL: 3,   // bold
  WRAP: 4,    // wrapped text
  PERCENT: 5, // 0% number format
  NOTE: 6     // italic, wrapped
};

// ---------------------------------------------------------------------------
// Worksheet builder
// ---------------------------------------------------------------------------

class SheetBuilder {
  constructor(name, sharedStrings) {
    this.name = name;
    this.ss = sharedStrings;
    this.rows = new Map(); // rowNumber -> Map<colIndex0, cellXml>
    this.colWidths = {};   // colIndex0 -> width
    this.maxCol = 0;
    this.validations = []; // { sqref, list: [values] }
  }

  _row(rowNumber) {
    if (!this.rows.has(rowNumber)) this.rows.set(rowNumber, new Map());
    return this.rows.get(rowNumber);
  }

  setColWidth(colIndex0, width) {
    this.colWidths[colIndex0] = width;
  }

  str(rowNumber, colIndex0, text, styleId = STYLE.DEFAULT) {
    const idx = this.ss.add(String(text));
    this._row(rowNumber).set(colIndex0, `<c r="${ref(colIndex0, rowNumber)}" s="${styleId}" t="s"><v>${idx}</v></c>`);
    this.maxCol = Math.max(this.maxCol, colIndex0);
  }

  num(rowNumber, colIndex0, value, styleId = STYLE.DEFAULT) {
    this._row(rowNumber).set(colIndex0, `<c r="${ref(colIndex0, rowNumber)}" s="${styleId}"><v>${value}</v></c>`);
    this.maxCol = Math.max(this.maxCol, colIndex0);
  }

  formula(rowNumber, colIndex0, formulaText, styleId = STYLE.DEFAULT) {
    this._row(rowNumber).set(
      colIndex0,
      `<c r="${ref(colIndex0, rowNumber)}" s="${styleId}"><f>${escapeXml(formulaText)}</f></c>`
    );
    this.maxCol = Math.max(this.maxCol, colIndex0);
  }

  // A styled, empty cell -- used so a blank fill-in cell still carries a
  // border/wrap style instead of being entirely absent from the row.
  blank(rowNumber, colIndex0, styleId = STYLE.DEFAULT) {
    this._row(rowNumber).set(colIndex0, `<c r="${ref(colIndex0, rowNumber)}" s="${styleId}"/>`);
    this.maxCol = Math.max(this.maxCol, colIndex0);
  }

  // In-cell dropdown restricted to a short literal list of values.
  addListValidation(sqref, values) {
    this.validations.push({ sqref, values });
  }

  toXml() {
    const rowNumbers = [...this.rows.keys()].sort((a, b) => a - b);
    const lastRow = rowNumbers.length ? rowNumbers[rowNumbers.length - 1] : 1;
    const dimensionEnd = ref(this.maxCol, lastRow);

    const rowsXml = rowNumbers
      .map(rn => {
        const cells = this.rows.get(rn);
        const colIndexes = [...cells.keys()].sort((a, b) => a - b);
        const cellsXml = colIndexes.map(ci => cells.get(ci)).join('');
        return `<row r="${rn}">${cellsXml}</row>`;
      })
      .join('');

    const colIdxs = Object.keys(this.colWidths).map(Number).sort((a, b) => a - b);
    const colsXml = colIdxs.length
      ? `<cols>${colIdxs
          .map(i => `<col min="${i + 1}" max="${i + 1}" width="${this.colWidths[i]}" customWidth="1"/>`)
          .join('')}</cols>`
      : '';

    const validationsXml = this.validations.length
      ? `<dataValidations count="${this.validations.length}">${this.validations
          .map(
            v =>
              `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="${v.sqref}"><formula1>"${escapeXml(
                v.values.join(',')
              )}"</formula1></dataValidation>`
          )
          .join('')}</dataValidations>`
      : '';

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${dimensionEnd}"/>
<sheetViews><sheetView workbookViewId="0"/></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
${colsXml}
<sheetData>${rowsXml}</sheetData>
${validationsXml}
</worksheet>`;
  }
}

// ---------------------------------------------------------------------------
// styles.xml -- must define STYLE's 7 indexes, in order, as cellXfs entries.
// ---------------------------------------------------------------------------

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="14"/><name val="Calibri"/></font>
<font><i/><sz val="10"/><name val="Calibri"/></font>
</fonts>
<fills count="2">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color indexed="64"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
</cellStyleXfs>
<cellXfs count="7">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
<xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
</cellXfs>
<cellStyles count="1">
<cellStyle name="Normal" xfId="0" builtinId="0"/>
</cellStyles>
</styleSheet>`;
}

// ---------------------------------------------------------------------------
// Package-level XML parts
// ---------------------------------------------------------------------------

function buildContentTypesXml(sheetCount) {
  const overrides = [];
  for (let i = 1; i <= sheetCount; i++) {
    overrides.push(
      `<Override PartName="/xl/worksheets/sheet${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    );
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${overrides.join('\n')}
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
}

function buildRootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function buildWorkbookXml(sheetNames) {
  const sheets = sheetNames
    .map((name, i) => `<sheet name="${escapeXml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('');
  // fullCalcOnLoad forces every formula to recompute the moment the workbook
  // is opened. We never write a cached <v> alongside a formula's <f> (see
  // SheetBuilder.formula()), so without this flag a strict reader could show
  // blank/zero for a computed column until the user forces a manual recalc.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheets}</sheets>
<calcPr calcId="181029" fullCalcOnLoad="1"/>
</workbook>`;
}

function buildWorkbookRelsXml(sheetCount) {
  const rels = [];
  for (let i = 1; i <= sheetCount; i++) {
    rels.push(
      `<Relationship Id="rId${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i}.xml"/>`
    );
  }
  const stylesId = sheetCount + 1;
  const sharedStringsId = sheetCount + 2;
  rels.push(
    `<Relationship Id="rId${stylesId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
  );
  rels.push(
    `<Relationship Id="rId${sharedStringsId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>`
  );
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${rels.join('\n')}
</Relationships>`;
}

// ---------------------------------------------------------------------------
// Sheet content -- one builder function per sheet.
// ---------------------------------------------------------------------------

// Single source of truth shared with the web tracker (src/web/pagesB3.js's
// renderTracker()) -- extracted here so both the
// xlsx's Game Log dropdown and the web tracker's equivalent field can never
// drift apart the way two independently-maintained literal arrays would.
const DEATH_CAUSES = require(path.join('..', '..', 'content', 'deathCauses.json'));

const GAME_LOG_DATA_START_ROW = 10; // row after the header row (9)
const GAME_LOG_DATA_END_ROW = 69;   // 60 rows: 10..69
const GAME_LOG_SHEET_NAME = 'Game Log';

function buildStartHereSheet(ss, version, lastReviewed) {
  const s = new SheetBuilder('Start Here', ss);
  s.setColWidth(0, 100);
  let r = 1;
  s.str(r++, 0, 'Solo Queue Practice System - Tracker Workbook', STYLE.TITLE);
  r++;
  s.str(r++, 0, 'How to use this workbook', STYLE.LABEL);
  s.str(r++, 0, '1. Open the Baseline tab and fill in your last 10 ranked games from your own in-client match history.');
  s.str(r++, 0, "2. Enter your current rank on the Baseline tab to compare your averages against the Benchmarks tab.");
  s.str(r++, 0, '3. As you play your 30-day program, log every game on the Game Log tab (the summary numbers at the top update automatically).');
  s.str(r++, 0, '4. At the end of each 10-game block, fill in the Block Review tab.');
  s.str(r++, 0, '5. Track champions you are testing on the Champion Pool tab (optional -- ships blank).');
  s.str(r++, 0, '6. The Benchmarks tab is reference data; you should not need to edit it.');
  r++;
  s.str(
    r++,
    0,
    'This workbook has no macros. Every computed column uses ordinary spreadsheet formulas, so it keeps working if you copy or import it into another spreadsheet application.'
  );
  r++;
  s.str(r++, 0, `${RIOT_DISCLAIMER} ${TRADEMARK_NOTICE}`, STYLE.NOTE);
  s.str(r++, 0, `v${version} - last reviewed ${lastReviewed}`, STYLE.NOTE);
  return s;
}

function buildBaselineSheet(ss) {
  const s = new SheetBuilder('Baseline', ss);
  s.setColWidth(0, 46);
  for (let c = 1; c <= 8; c++) s.setColWidth(c, 14);

  s.str(1, 0, 'Baseline: Your Last 10 Games', STYLE.TITLE);

  s.str(2, 0, "Your current rank (spelled exactly as on the Benchmarks tab):", STYLE.LABEL);
  s.str(2, 2, 'Gold'); // default editable input
  s.addListValidation('C2', ['Iron-Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master+']);

  s.str(3, 0, "Benchmark CS/min range for that rank:", STYLE.LABEL);
  s.formula(
    3,
    2,
    'IFERROR(INDEX(Benchmarks!$B$6:$B$12,MATCH($C$2,Benchmarks!$A$6:$A$12,0))&" - "&INDEX(Benchmarks!$C$6:$C$12,MATCH($C$2,Benchmarks!$A$6:$A$12,0)),"rank not found - check spelling against Benchmarks tab")'
  );

  s.str(4, 0, 'Your average CS/min (from the 10 rows below):', STYLE.LABEL);
  s.formula(4, 2, 'G20');

  s.str(5, 0, 'Comparison:', STYLE.LABEL);
  s.formula(
    5,
    2,
    'IFERROR(IF(G20="","Enter your 10 games below to see a comparison.",IF(G20>=INDEX(Benchmarks!$B$6:$B$12,MATCH($C$2,Benchmarks!$A$6:$A$12,0)),"At or above the benchmark range for "&$C$2,"Below the benchmark range for "&$C$2)),"Check that your rank (cell C2) is spelled exactly as on the Benchmarks tab.")'
  );

  const headers = ['Date', 'Champion', 'Role', 'Result', 'CS@10', 'Minutes', 'CS/min', 'Deaths', 'Vision Score'];
  const headerRow = 8;
  headers.forEach((h, i) => s.str(headerRow, i, h, STYLE.HEADER));

  const dataStart = headerRow + 1; // 9
  const dataEnd = dataStart + 9;   // 10 rows: 9..18
  for (let r = dataStart; r <= dataEnd; r++) {
    for (let c = 0; c <= 5; c++) s.blank(r, c);
    s.formula(r, 6, `IF(AND(E${r}<>"",F${r}<>"",F${r}<>0),E${r}/F${r},"")`);
    for (let c = 7; c <= 8; c++) s.blank(r, c);
  }
  s.addListValidation(`D${dataStart}:D${dataEnd}`, ['W', 'L']);

  const avgRow = dataEnd + 2; // 20
  s.str(avgRow, 3, 'AVERAGES ->', STYLE.LABEL);
  s.formula(avgRow, 4, `IFERROR(AVERAGE(E${dataStart}:E${dataEnd}),"")`);
  s.formula(avgRow, 5, `IFERROR(AVERAGE(F${dataStart}:F${dataEnd}),"")`);
  s.formula(avgRow, 6, `IFERROR(AVERAGE(G${dataStart}:G${dataEnd}),"")`);
  s.formula(avgRow, 7, `IFERROR(AVERAGE(H${dataStart}:H${dataEnd}),"")`);
  s.formula(avgRow, 8, `IFERROR(AVERAGE(I${dataStart}:I${dataEnd}),"")`);

  return s;
}

function buildGameLogSheet(ss) {
  const s = new SheetBuilder(GAME_LOG_SHEET_NAME, ss);
  s.setColWidth(0, 12);
  s.setColWidth(1, 16);
  s.setColWidth(2, 10);
  s.setColWidth(3, 9);
  s.setColWidth(4, 22);
  s.setColWidth(5, 12);
  s.setColWidth(6, 8);
  s.setColWidth(7, 9);
  s.setColWidth(8, 9);
  s.setColWidth(9, 8);
  s.setColWidth(10, 20);
  s.setColWidth(11, 8);
  s.setColWidth(12, 40);

  s.str(1, 0, 'Game Log', STYLE.TITLE);

  const D = GAME_LOG_DATA_START_ROW;
  const E = GAME_LOG_DATA_END_ROW;

  s.str(3, 0, 'Win rate - focus-adherent games (adherence 4 or 5):', STYLE.LABEL);
  s.formula(3, 3, `IFERROR(COUNTIFS($F$${D}:$F$${E},">=4",$D$${D}:$D$${E},"W")/COUNTIF($F$${D}:$F$${E},">=4"),"")`, STYLE.PERCENT);

  s.str(4, 0, 'Win rate - non-adherent games (adherence 1-3):', STYLE.LABEL);
  s.formula(4, 3, `IFERROR(COUNTIFS($F$${D}:$F$${E},"<4",$D$${D}:$D$${E},"W")/COUNTIF($F$${D}:$F$${E},"<4"),"")`, STYLE.PERCENT);

  s.str(5, 0, 'Rolling average CS/min (most recent 10 logged games):', STYLE.LABEL);
  s.formula(
    5,
    3,
    `IFERROR(AVERAGE(OFFSET($I$${D},MAX(0,COUNTA($A$${D}:$A$${E})-10),0,MIN(10,COUNTA($A$${D}:$A$${E})),1)),"")`
  );

  s.str(6, 0, 'Rolling average deaths (most recent 10 logged games):', STYLE.LABEL);
  s.formula(
    6,
    3,
    `IFERROR(AVERAGE(OFFSET($J$${D},MAX(0,COUNTA($A$${D}:$A$${E})-10),0,MIN(10,COUNTA($A$${D}:$A$${E})),1)),"")`
  );

  s.str(7, 0, 'Focus adherence % (logged games with adherence 4 or 5):', STYLE.LABEL);
  s.formula(7, 3, `IFERROR(COUNTIF($F$${D}:$F$${E},">=4")/COUNTA($F$${D}:$F$${E}),"")`, STYLE.PERCENT);

  const headers = [
    'Date', 'Champion', 'Role', 'Result', 'Focus', 'Adherence (1-5)',
    'CS@10', 'Minutes', 'CS/min', 'Deaths', 'Primary Death Cause', 'Vision Score', 'One-Sentence Lesson'
  ];
  const headerRow = 9;
  headers.forEach((h, i) => s.str(headerRow, i, h, STYLE.HEADER));

  for (let r = D; r <= E; r++) {
    for (let c = 0; c <= 7; c++) s.blank(r, c);
    s.formula(r, 8, `IF(AND(G${r}<>"",H${r}<>"",H${r}<>0),G${r}/H${r},"")`);
    for (let c = 9; c <= 12; c++) s.blank(r, c, c === 12 ? STYLE.WRAP : STYLE.DEFAULT);
  }
  s.addListValidation(`D${D}:D${E}`, ['W', 'L']);
  s.addListValidation(`F${D}:F${E}`, [1, 2, 3, 4, 5]);
  s.addListValidation(`K${D}:K${E}`, DEATH_CAUSES);

  return s;
}

function buildBlockReviewSheet(ss) {
  const s = new SheetBuilder('Block Review', ss);
  s.setColWidth(0, 44);
  s.setColWidth(1, 14);
  s.setColWidth(2, 46);

  s.str(1, 0, 'Block Review', STYLE.TITLE);
  s.str(
    2,
    0,
    `Each block's "start row" / "end row" point at Game Log rows. Defaults match the 30-day calendar (3 blocks of 10 games); change them if you log games in a different order.`,
    STYLE.NOTE
  );

  const blockDefaults = [
    { start: GAME_LOG_DATA_START_ROW, end: GAME_LOG_DATA_START_ROW + 9 },
    { start: GAME_LOG_DATA_START_ROW + 10, end: GAME_LOG_DATA_START_ROW + 19 },
    { start: GAME_LOG_DATA_START_ROW + 20, end: GAME_LOG_DATA_START_ROW + 29 }
  ];

  let row = 4;
  const avgCsRefs = [];

  blockDefaults.forEach((def, i) => {
    const blockNum = i + 1;
    const base = row;

    s.str(base, 0, `BLOCK ${blockNum}`, STYLE.HEADER);
    row++;

    s.str(row, 0, 'Focus for this block:');
    s.blank(row, 2);
    row++;

    s.str(row, 0, 'Game Log start row:');
    s.num(row, 2, def.start);
    const startCell = ref(2, row);
    row++;

    s.str(row, 0, 'Game Log end row:');
    s.num(row, 2, def.end);
    const endCell = ref(2, row);
    row++;

    s.str(row, 0, 'Average CS/min this block:');
    const csMinFormula = `IFERROR(AVERAGE(INDEX('${GAME_LOG_SHEET_NAME}'!$I:$I,${startCell}):INDEX('${GAME_LOG_SHEET_NAME}'!$I:$I,${endCell})),"")`;
    s.formula(row, 2, csMinFormula);
    const csMinCell = ref(2, row);
    avgCsRefs.push(csMinCell);
    row++;

    s.str(row, 0, 'Average deaths this block:');
    s.formula(
      row,
      2,
      `IFERROR(AVERAGE(INDEX('${GAME_LOG_SHEET_NAME}'!$J:$J,${startCell}):INDEX('${GAME_LOG_SHEET_NAME}'!$J:$J,${endCell})),"")`
    );
    row++;

    s.str(row, 0, 'Win rate this block:');
    s.formula(
      row,
      2,
      `IFERROR(COUNTIF(INDEX('${GAME_LOG_SHEET_NAME}'!$D:$D,${startCell}):INDEX('${GAME_LOG_SHEET_NAME}'!$D:$D,${endCell}),"W")/COUNTA(INDEX('${GAME_LOG_SHEET_NAME}'!$D:$D,${startCell}):INDEX('${GAME_LOG_SHEET_NAME}'!$D:$D,${endCell})),"")`,
      STYLE.PERCENT
    );
    row++;

    s.str(row, 0, 'Delta vs previous block (CS/min):');
    if (i === 0) {
      s.str(row, 2, 'n/a (first block)');
    } else {
      s.formula(row, 2, `IFERROR(${csMinCell}-${avgCsRefs[i - 1]},"")`);
    }
    row++;

    s.str(row, 0, 'What worked / what to change next block:', STYLE.LABEL);
    s.blank(row, 2, STYLE.WRAP);
    row += 2;
  });

  return s;
}

function buildChampionPoolSheet(ss) {
  const s = new SheetBuilder('Champion Pool', ss);
  s.setColWidth(0, 20);
  s.setColWidth(1, 10);
  s.setColWidth(2, 10);
  s.setColWidth(3, 10);
  s.setColWidth(4, 40);

  s.str(1, 0, 'Champion Pool', STYLE.TITLE);
  s.str(2, 0, 'Ships empty by design -- fill in the champions you are testing during your program.', STYLE.NOTE);

  const headers = ['Champion', 'Games', 'WR', 'KDA', 'Notes'];
  headers.forEach((h, i) => s.str(4, i, h, STYLE.HEADER));

  for (let r = 5; r <= 19; r++) {
    for (let c = 0; c <= 4; c++) s.blank(r, c, c === 4 ? STYLE.WRAP : STYLE.DEFAULT);
  }

  return s;
}

function buildBenchmarksSheet(ss, benchmarks) {
  const s = new SheetBuilder('Benchmarks', ss);
  s.setColWidth(0, 16);
  s.setColWidth(1, 14);
  s.setColWidth(2, 14);

  s.str(1, 0, 'Benchmarks (reference data -- do not need to edit)', STYLE.TITLE);
  s.str(2, 0, benchmarks.provenance, STYLE.NOTE);
  s.str(3, 0, benchmarks.junglerAdjustment.note, STYLE.NOTE);

  const headerRow = 5;
  ['Rank', 'CS/min Min', 'CS/min Max'].forEach((h, i) => s.str(headerRow, i, h, STYLE.HEADER));

  let r = headerRow + 1;
  for (const rank of benchmarks.ranks) {
    s.str(r, 0, rank.rank);
    s.num(r, 1, rank.csPerMinMin);
    s.num(r, 2, rank.csPerMinMax);
    r++;
  }

  r += 1;
  s.str(r, 0, 'CS by 10:00 targets', STYLE.LABEL);
  r++;
  s.str(r, 0, 'Baseline target:');
  s.num(r, 1, benchmarks.csAt10Targets.baseline.value);
  s.str(r, 2, benchmarks.csAt10Targets.baseline.note);
  r++;
  s.str(r, 0, 'Stretch target:');
  s.num(r, 1, benchmarks.csAt10Targets.stretch.value);
  s.str(r, 2, benchmarks.csAt10Targets.stretch.note);

  return s;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

function buildTrackerWorkbook(benchmarks, { version = '1.0.0', lastReviewed = '2026-08-12' } = {}) {
  const ss = new SharedStrings();

  const sheets = [
    buildStartHereSheet(ss, version, lastReviewed),
    buildBaselineSheet(ss),
    buildGameLogSheet(ss),
    buildBlockReviewSheet(ss),
    buildChampionPoolSheet(ss),
    buildBenchmarksSheet(ss, benchmarks)
  ];

  const zip = new ZipWriter();
  zip.addFile('[Content_Types].xml', buildContentTypesXml(sheets.length));
  zip.addFile('_rels/.rels', buildRootRelsXml());
  zip.addFile('xl/workbook.xml', buildWorkbookXml(sheets.map(s => s.name)));
  zip.addFile('xl/_rels/workbook.xml.rels', buildWorkbookRelsXml(sheets.length));
  zip.addFile('xl/styles.xml', buildStylesXml());
  sheets.forEach((sheet, i) => {
    zip.addFile(`xl/worksheets/sheet${i + 1}.xml`, sheet.toXml());
  });
  // Every sheet's str() calls already populated the shared-strings pool (ss.add()
  // runs eagerly inside SheetBuilder.str(), during the build*Sheet() calls above),
  // so the pool is complete before we serialize it here.
  zip.addFile('xl/sharedStrings.xml', ss.toXml());

  return zip.toBuffer();
}

module.exports = {
  buildTrackerWorkbook,
  SheetBuilder,
  SharedStrings,
  colLetter,
  ref,
  STYLE,
  GAME_LOG_DATA_START_ROW,
  GAME_LOG_DATA_END_ROW,
  GAME_LOG_SHEET_NAME
};
