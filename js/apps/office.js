/* ============================================================
 * KevinOS · KOffice 办公套件
 * 文字（Word）/ 表格（Excel）/ 演示（PPT）/ PDF 四大模块
 * 零依赖，纯前端实现，可保存到虚拟文件系统
 * ============================================================ */
(function () {
  'use strict';
  const K = window.KevinOS;
  const { el } = K.util;
  const FS = K.FS;

  /* ---------------- 通用工具 ---------------- */
  function download(name, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  function desc(s) { return s == null ? '' : String(s).replace(/\s+/g, ' ').trim().slice(0, 26); }
  function colName(i) { let s = '', n = i + 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; }
  function colIndex(name) { let n = 0; for (const ch of name.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; }
  function uid(t) { return t + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function rgba(hex, a) { const h = hex.replace('#', ''); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16); return `rgba(${r},${g},${b},${a})`; }
  function xesc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }

  /* ============================================================
   * OOXML 支持：ZIP 打包（CRC-32 + store）、DOCX / XLSX / PPTX 生成
   * 生成的文档为真正的 Office Open XML，可被 WPS / Office 365 直接打开
   * ============================================================ */
  const CRC_TABLE = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
    return t;
  })();
  function crc32(bytes) { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function strToBytes(s) {
    const bytes = [];
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i);
      if (code < 0x80) bytes.push(code);
      else if (code < 0x800) { bytes.push(0xC0 | (code >> 6)); bytes.push(0x80 | (code & 0x3F)); }
      else { bytes.push(0xE0 | (code >> 12)); bytes.push(0x80 | ((code >> 6) & 0x3F)); bytes.push(0x80 | (code & 0x3F)); }
    }
    return new Uint8Array(bytes);
  }
  function zipStore(files) {
    // files: [{name, content}] -> Uint8Array（使用 store 方式，不压缩）
    const localParts = [], centralParts = [];
    let offset = 0, centralSize = 0;
    files.forEach(f => {
      const nameBytes = strToBytes(f.name);
      const dataBytes = strToBytes(f.content);
      const crc = crc32(dataBytes);
      const size = dataBytes.length;
      const lh = new Uint8Array(30 + nameBytes.length);
      const dv = new DataView(lh.buffer);
      dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0, true);
      dv.setUint16(8, 0, true); dv.setUint16(10, 0, true); dv.setUint16(12, 0, true);
      dv.setUint32(14, crc, true); dv.setUint32(18, size, true); dv.setUint32(22, size, true);
      dv.setUint16(26, nameBytes.length, true); dv.setUint16(28, 0, true);
      lh.set(nameBytes, 30);
      localParts.push(lh, dataBytes);
      const ch = new Uint8Array(46 + nameBytes.length);
      const cdv = new DataView(ch.buffer);
      cdv.setUint32(0, 0x02014b50, true); cdv.setUint16(4, 20, true); cdv.setUint16(6, 20, true);
      cdv.setUint16(8, 0, true); cdv.setUint16(10, 0, true); cdv.setUint16(12, 0, true); cdv.setUint16(14, 0, true);
      cdv.setUint32(16, crc, true); cdv.setUint32(20, size, true); cdv.setUint32(24, size, true);
      cdv.setUint16(28, nameBytes.length, true); cdv.setUint16(30, 0, true); cdv.setUint16(32, 0, true);
      cdv.setUint16(34, 0, true); cdv.setUint16(36, 0, true); cdv.setUint32(38, 0, true); cdv.setUint32(42, offset, true);
      ch.set(nameBytes, 46);
      centralParts.push(ch);
      centralSize += ch.length;
      offset += lh.length + dataBytes.length;
    });
    const eocd = new Uint8Array(22);
    const edv = new DataView(eocd.buffer);
    edv.setUint32(0, 0x06054b50, true); edv.setUint16(4, 0, true); edv.setUint16(6, 0, true);
    edv.setUint16(8, files.length, true); edv.setUint16(10, files.length, true);
    edv.setUint32(12, centralSize, true); edv.setUint32(16, offset, true); edv.setUint16(20, 0, true);
    const total = offset + centralSize + eocd.length;
    const out = new Uint8Array(total);
    let pos = 0;
    localParts.forEach(p => { out.set(p, pos); pos += p.length; });
    centralParts.forEach(p => { out.set(p, pos); pos += p.length; });
    out.set(eocd, pos);
    return out;
  }
  const XMLDECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

  /* ---------------- DOCX（WordprocessingML） ---------------- */
  function wmlRun(text, o) {
    let rpr = '';
    if (o && o.b) rpr += '<w:b/><w:bCs/>';
    if (o && o.i) rpr += '<w:i/><w:iCs/>';
    if (o && o.u) rpr += '<w:u w:val="single"/>';
    return '<w:r>' + (rpr ? '<w:rPr>' + rpr + '</w:rPr>' : '') + '<w:t xml:space="preserve">' + xesc(text) + '</w:t></w:r>';
  }
  function wmlInline(node, o) {
    o = o || {};
    let s = '';
    Array.prototype.forEach.call(node.childNodes, child => {
      if (child.nodeType === 3) { if (child.textContent) s += wmlRun(child.textContent, o); return; }
      if (child.nodeType !== 1) return;
      const tag = child.tagName.toLowerCase();
      if (tag === 'br') { s += '<w:r><w:br/></w:r>'; return; }
      if (tag === 'b' || tag === 'strong') { s += wmlInline(child, { b: true, i: o.i, u: o.u }); return; }
      if (tag === 'i' || tag === 'em') { s += wmlInline(child, { b: o.b, i: true, u: o.u }); return; }
      if (tag === 'u') { s += wmlInline(child, { b: o.b, i: o.i, u: true }); return; }
      if (tag === 'img') return;
      s += wmlInline(child, o);
    });
    return s;
  }
  function htmlToWmlBody(html) {
    let root;
    try { const dom = new DOMParser().parseFromString('<div id="__kw">' + (html || '') + '</div>', 'text/html'); root = dom.getElementById('__kw'); }
    catch (e) { root = null; }
    if (!root) return '<w:p>' + wmlRun(String(html || '').replace(/<[^>]+>/g, ''), {}) + '</w:p>';
    let out = '';
    Array.prototype.forEach.call(root.childNodes, node => {
      if (node.nodeType === 3) { if (node.textContent && node.textContent.trim()) out += '<w:p>' + wmlRun(node.textContent, {}) + '</w:p>'; return; }
      if (node.nodeType !== 1) return;
      const tag = node.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        const n = Math.min(parseInt(tag[1], 10), 3);
        out += '<w:p><w:pPr><w:pStyle w:val="Heading' + n + '"/></w:pPr>' + wmlInline(node, { b: true }) + '</w:p>';
        return;
      }
      if (tag === 'ul' || tag === 'ol') {
        let i = 1;
        Array.prototype.forEach.call(node.children, li => {
          const prefix = tag === 'ol' ? (i++) + '. ' : '• ';
          out += '<w:p><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr>' + wmlRun(prefix, {}) + wmlInline(li, {}) + '</w:p>';
        });
        return;
      }
      if (tag === 'blockquote') { out += '<w:p><w:pPr><w:ind w:left="720"/><w:pStyle w:val="Normal"/></w:pPr>' + wmlInline(node, { i: true }) + '</w:p>'; return; }
      if (tag === 'table') {
        let trs = '';
        Array.prototype.forEach.call(node.querySelectorAll('tr'), tr => {
          let tcs = '';
          Array.prototype.forEach.call(tr.children, cell => {
            tcs += '<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr><w:p>' + wmlInline(cell, {}) + '</w:p></w:tc>';
          });
          trs += '<w:tr>' + tcs + '</w:tr>';
        });
        const bd = '<w:top w:val="single" w:sz="4" w:space="0" w:color="BBBBBB"/><w:left w:val="single" w:sz="4" w:space="0" w:color="BBBBBB"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="BBBBBB"/><w:right w:val="single" w:sz="4" w:space="0" w:color="BBBBBB"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="BBBBBB"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="BBBBBB"/>';
        out += '<w:tbl><w:tblPr><w:tblBorders>' + bd + '</w:tblBorders></w:tblPr>' + trs + '</w:tbl><w:p/>';
        return;
      }
      out += '<w:p>' + wmlInline(node, {}) + '</w:p>';
    });
    return out || '<w:p/>';
  }
  function buildDOCX(html) {
    const body = htmlToWmlBody(html);
    const files = [];
    files.push({ name: '[Content_Types].xml', content: XMLDECL +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '</Types>' });
    files.push({ name: '_rels/.rels', content: XMLDECL +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>' });
    files.push({ name: 'word/document.xml', content: XMLDECL +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<w:body>' + body +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>' +
      '</w:body></w:document>' });
    files.push({ name: 'word/_rels/document.xml.rels', content: XMLDECL +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>' });
    files.push({ name: 'word/styles.xml', content: XMLDECL +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="宋体" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:rPr><w:b/><w:sz w:val="48"/><w:szCs w:val="48"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>' +
      '</w:styles>' });
    return zipStore(files);
  }

  /* ---------------- XLSX（SpreadsheetML） ---------------- */
  function buildXLSX(sheet) {
    const rows = [];
    for (let r = 1; r <= sheet.rows; r++) {
      let cells = '';
      for (let c = 0; c < sheet.cols; c++) {
        const cell = sheet.cells[colName(c) + r];
        if (!cell || cell.v == null || cell.v === '') continue;
        const ref = colName(c) + r;
        if (typeof cell.v === 'number') cells += '<c r="' + ref + '"><v>' + cell.v + '</v></c>';
        else {
          const n = parseFloat(cell.v);
          if (!isNaN(n) && String(n) === String(cell.v).trim()) cells += '<c r="' + ref + '"><v>' + n + '</v></c>';
          else cells += '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + xesc(cell.v) + '</t></is></c>';
        }
      }
      if (cells) rows.push('<row r="' + r + '">' + cells + '</row>');
    }
    const lastCol = colName(Math.max(0, sheet.cols - 1));
    const files = [];
    files.push({ name: '[Content_Types].xml', content: XMLDECL +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '</Types>' });
    files.push({ name: '_rels/.rels', content: XMLDECL +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>' });
    files.push({ name: 'xl/workbook.xml', content: XMLDECL +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>' +
      '</workbook>' });
    files.push({ name: 'xl/_rels/workbook.xml.rels', content: XMLDECL +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>' });
    files.push({ name: 'xl/worksheets/sheet1.xml', content: XMLDECL +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<dimension ref="A1:' + lastCol + Math.max(1, sheet.rows) + '"/>' +
      '<sheetViews><sheetView workbookViewId="0"/></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      '<sheetData>' + rows.join('') + '</sheetData>' +
      '</worksheet>' });
    files.push({ name: 'xl/styles.xml', content: XMLDECL +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
      '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>' });
    return zipStore(files);
  }

  /* ---------------- PPTX（PresentationML） ---------------- */
  function buildPPTX(data) {
    const slides = (data && data.slides && data.slides.length) ? data.slides : [{ title: '演示文稿', body: '', bg: '#1b2a4a', fg: '#ffffff' }];
    const files = [];
    let ct = XMLDECL + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
      '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
      '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
      '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>';
    slides.forEach((_, i) => { ct += '<Override PartName="/ppt/slides/slide' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'; });
    ct += '</Types>';
    files.push({ name: '[Content_Types].xml', content: ct });
    files.push({ name: '_rels/.rels', content: XMLDECL +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>' +
      '</Relationships>' });
    let pres = XMLDECL + '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
      '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>';
    slides.forEach((_, i) => { pres += '<p:sldId id="' + (256 + i) + '" r:id="rId' + (i + 2) + '"/>'; });
    pres += '</p:sldIdLst><p:sldSz cx="9144000" cy="6858000" type="screen4x3"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>';
    files.push({ name: 'ppt/presentation.xml', content: pres });
    let pr = XMLDECL + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>';
    slides.forEach((_, i) => { pr += '<Relationship Id="rId' + (i + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide' + (i + 1) + '.xml"/>'; });
    pr += '</Relationships>';
    files.push({ name: 'ppt/_rels/presentation.xml.rels', content: pr });
    files.push({ name: 'ppt/theme/theme1.xml', content: XMLDECL +
      '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme"><a:themeElements>' +
      '<a:clrScheme name="Office"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1B2A4A"/></a:dk2><a:lt2><a:srgbClr val="E8ECF4"/></a:lt2><a:accent1><a:srgbClr val="2B6CFF"/></a:accent1><a:accent2><a:srgbClr val="E2483D"/></a:accent2><a:accent3><a:srgbClr val="109D58"/></a:accent3><a:accent4><a:srgbClr val="F5732C"/></a:accent4><a:accent5><a:srgbClr val="8A4BFF"/></a:accent5><a:accent6><a:srgbClr val="00A6CB"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>' +
      '<a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface="宋体"/><a:cs typeface="Calibri Light"/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface="宋体"/><a:cs typeface="Calibri"/></a:minorFont></a:fontScheme>' +
      '<a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>' +
      '</a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>' });
    files.push({ name: 'ppt/slideMasters/slideMaster1.xml', content: XMLDECL +
      '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
      '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>' +
      '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
      '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
      '<p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>' });
    files.push({ name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', content: XMLDECL +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>' +
      '</Relationships>' });
    files.push({ name: 'ppt/slideLayouts/slideLayout1.xml', content: XMLDECL +
      '<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="title">' +
      '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>' +
      '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>' });
    files.push({ name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', content: XMLDECL +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>' +
      '</Relationships>' });
    slides.forEach((s, i) => {
      const bgHex = (s.bg || '#1b2a4a').replace('#', '').toUpperCase();
      const fgHex = (s.fg || '#ffffff').replace('#', '').toUpperCase();
      const title = xesc(s.title || '');
      const bodyText = String(s.body || '');
      let slide = XMLDECL + '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld>' +
        '<p:bg><p:bgPr><a:solidFill><a:srgbClr val="' + bgHex + '"/></a:solidFill></p:bgPr></p:bg><p:spTree>' +
        '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>' +
        '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>' +
        '<p:spPr><a:xfrm><a:off x="457200" y="457200"/><a:ext cx="8229600" cy="1143000"/></a:xfrm></p:spPr>' +
        '<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="4000" b="1"><a:solidFill><a:srgbClr val="' + fgHex + '"/></a:solidFill><a:latin typeface="Calibri Light"/><a:ea typeface="宋体"/></a:rPr><a:t>' + title + '</a:t></a:r></a:p></p:txBody></p:sp>';
      let bodyParas = '';
      bodyText.split('\n').forEach(line => { bodyParas += '<a:p><a:r><a:rPr lang="zh-CN" sz="2400"><a:solidFill><a:srgbClr val="' + fgHex + '"/></a:solidFill><a:latin typeface="Calibri"/><a:ea typeface="宋体"/></a:rPr><a:t>' + xesc(line) + '</a:t></a:r></a:p>'; });
      slide += '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Body"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>' +
        '<p:spPr><a:xfrm><a:off x="457200" y="1828800"/><a:ext cx="8229600" cy="4114800"/></a:xfrm></p:spPr>' +
        '<p:txBody><a:bodyPr wrap="square" anchor="t"/><a:lstStyle/>' + bodyParas + '</p:txBody></p:sp>' +
        '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
      files.push({ name: 'ppt/slides/slide' + (i + 1) + '.xml', content: slide });
      files.push({ name: 'ppt/slides/_rels/slide' + (i + 1) + '.xml.rels', content: XMLDECL +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
        '</Relationships>' });
    });
    return zipStore(files);
  }

  /* ---------------- OOXML 读取（解包 ZIP，用于回读保存的文件） ---------------- */
  function inflateRaw(bytes) {
    return new Promise((resolve, reject) => {
      try {
        const ds = new DecompressionStream('deflate-raw');
        const stream = new Blob([bytes]).stream().pipeThrough(ds);
        new Response(stream).arrayBuffer().then(buf => resolve(new Uint8Array(buf))).catch(reject);
      } catch (e) { reject(e); }
    });
  }
  async function unzip(bytes) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= 0; i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) throw new Error('不是有效的 ZIP/OOXML 文件');
    const cdOffset = dv.getUint32(eocd + 16, true);
    const total = dv.getUint16(eocd + 10, true);
    const out = {};
    let pos = cdOffset;
    for (let n = 0; n < total; n++) {
      if (dv.getUint32(pos, true) !== 0x02014b50) break;
      const compMethod = dv.getUint16(pos + 10, true);
      const compSize = dv.getUint32(pos + 20, true);
      const nameLen = dv.getUint16(pos + 28, true);
      const extraLen = dv.getUint16(pos + 30, true);
      const commentLen = dv.getUint16(pos + 32, true);
      const localOffset = dv.getUint32(pos + 42, true);
      let name = '';
      for (let k = 0; k < nameLen; k++) name += String.fromCharCode(bytes[pos + 46 + k]);
      pos += 46 + nameLen + extraLen + commentLen;
      const lnNameLen = dv.getUint16(localOffset + 26, true);
      const lnExtraLen = dv.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + lnNameLen + lnExtraLen;
      let data = bytes.subarray(dataStart, dataStart + compSize);
      if (compMethod === 8) { try { data = await inflateRaw(data); } catch (e) { continue; } }
      out[name] = new TextDecoder('utf-8').decode(data);
    }
    return out;
  }
  async function parseDOCX(bytes) {
    const z = await unzip(bytes);
    const xml = z['word/document.xml'] || '';
    const paras = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
    let html = '';
    paras.forEach(p => {
      const style = (p.match(/<w:pStyle[^>]*w:val="([^"]+)"/) || [])[1] || '';
      const texts = (p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, ''));
      const text = texts.join('').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
      if (!text.trim()) return;
      const m = /^Heading(\d)/.exec(style);
      if (m) { const lvl = Math.min(parseInt(m[1], 10), 3); html += '<h' + lvl + '>' + xesc(text) + '</h' + lvl + '>'; }
      else html += '<p>' + xesc(text) + '</p>';
    });
    return html || '<p></p>';
  }
  async function parseXLSX(bytes) {
    const z = await unzip(bytes);
    const xml = z['xl/worksheets/sheet1.xml'] || '';
    const sheet = { cols: 12, rows: 30, cells: {} };
    const rowMatches = xml.match(/<row\b[\s\S]*?<\/row>/g) || [];
    let maxC = 0, maxR = 0;
    rowMatches.forEach(rowXml => {
      const rNum = parseInt((rowXml.match(/<row[^>]*\br="(\d+)"/) || [])[1] || '0', 10);
      const cells = rowXml.match(/<c\b[\s\S]*?<\/c>|<c\b[^>]*\/>/g) || [];
      cells.forEach(c => {
        const ref = (c.match(/r="([A-Z]+\d+)"/) || [])[1]; if (!ref) return;
        const col = colIndex(ref.replace(/\d+/g, ''));
        const row = parseInt(ref.replace(/[A-Z]+/g, ''), 10);
        let value = '';
        const vm = c.match(/<v>([\s\S]*?)<\/v>/);
        const im = c.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/);
        if (im) value = im[1];
        else if (vm) value = vm[1];
        if (value === '') return;
        value = value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
        const n = parseFloat(value);
        const cell = (!isNaN(n) && String(n) === value.trim()) ? { raw: value, v: n } : { raw: value, v: value };
        sheet.cells[colName(col) + row] = cell;
        if (col > maxC) maxC = col; if (row > maxR) maxR = row;
      });
    });
    sheet.cols = Math.max(12, maxC + 2); sheet.rows = Math.max(30, maxR + 2);
    return sheet;
  }
  async function parsePPTX(bytes) {
    const z = await unzip(bytes);
    const names = Object.keys(z).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)));
    const data = { index: 0, slides: [] };
    names.forEach(n => {
      const xml = z[n];
      const bgM = xml.match(/<a:srgbClr val="([0-9A-Fa-f]{6})"\/>/);
      let bg = bgM ? '#' + bgM[1] : '#1b2a4a', fg = '#ffffff';
      const sps = xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || [];
      let title = '', body = '';
      sps.forEach(sp => {
        const texts = (sp.match(/<a:t>([\s\S]*?)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"'));
        const cm = sp.match(/<a:solidFill><a:srgbClr val="([0-9A-Fa-f]{6})"/);
        const color = cm ? '#' + cm[1] : '#ffffff';
        if (/type="title"/.test(sp)) { title = texts.join(''); fg = color; }
        else if (texts.length) body += (body ? '\n' : '') + texts.join('\n');
      });
      data.slides.push({ title, body, bg, fg });
    });
    if (!data.slides.length) data.slides.push({ title: '新演示文稿', body: '', bg: '#1b2a4a', fg: '#ffffff' });
    return data;
  }
  // 按文档类型构建二进制 OOXML，返回 { bytes, ext, mime }
  function buildBinary(d) {
    if (d.type === 'doc') return { bytes: buildDOCX(d.data), ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    if (d.type === 'sheet') return { bytes: buildXLSX(d.data), ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    if (d.type === 'slide') return { bytes: buildPPTX(d.data), ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
    return null;
  }

  /* ---------------- 表格公式引擎 ---------------- */
  function numOf(sheet, ref) {
    const c = sheet.cells[ref.toUpperCase()];
    if (!c) return 0;
    if (typeof c.v === 'number') return c.v;
    const n = parseFloat(c.v); return isNaN(n) ? 0 : n;
  }
  function rangeRefs(a, b) {
    const m = (s) => { const r = s.match(/^([A-Z]+)(\d+)$/i); return r ? { c: r[1].toUpperCase(), r: parseInt(r[2]) } : null; };
    const A = m(a), B = m(b); if (!A || !B) return [];
    const refs = [];
    const c1 = Math.min(colIndex(A.c), colIndex(B.c)), c2 = Math.max(colIndex(A.c), colIndex(B.c));
    const r1 = Math.min(A.r, B.r), r2 = Math.max(A.r, B.r);
    for (let cc = c1; cc <= c2; cc++) for (let rr = r1; rr <= r2; rr++) refs.push(colName(cc) + rr);
    return refs;
  }
  function evalFormula(raw, sheet) {
    let e = raw.replace(/^=/, '').trim();
    // 函数与区域
    e = e.replace(/(SUM|AVERAGE|AVG|MIN|MAX|COUNT)\(([^()]*)\)/gi, (_, fn, args) => {
      const nums = [];
      args.split(',').forEach(a => {
        a = a.trim(); if (!a) return;
        const rng = a.match(/^([A-Z]+\d+)\s*:\s*([A-Z]+\d+)$/i);
        if (rng) rangeRefs(rng[1], rng[2]).forEach(ref => nums.push(numOf(sheet, ref)));
        else if (/^[A-Z]+\d+$/i.test(a)) nums.push(numOf(sheet, a));
        else { const n = parseFloat(a); if (!isNaN(n)) nums.push(n); }
      });
      fn = fn.toUpperCase();
      if (fn === 'SUM') return String(nums.reduce((x, y) => x + y, 0));
      if (fn === 'COUNT') return String(nums.filter(n => !isNaN(n)).length);
      if (fn === 'MIN') return String(nums.length ? Math.min(...nums) : 0);
      if (fn === 'MAX') return String(nums.length ? Math.max(...nums) : 0);
      return String(nums.length ? nums.reduce((x, y) => x + y, 0) / nums.length : 0); // AVG
    });
    // 单元格引用
    e = e.replace(/\b([A-Z]+)(\d+)\b/gi, (_, c, r) => String(numOf(sheet, (c + r).toUpperCase())));
    if (!/^[-+*/%(). 0-9]*$/.test(e)) return '#ERR';
    try { const v = Function('return (' + (e || '0') + ')')(); return (typeof v === 'number' && isFinite(v)) ? Math.round(v * 1e6) / 1e6 : '#ERR'; }
    catch (err) { return '#ERR'; }
  }
  function recalcSheet(sheet) {
    for (let pass = 0; pass < 6; pass++) {
      Object.keys(sheet.cells).forEach(ref => {
        const c = sheet.cells[ref];
        if (typeof c.raw === 'string' && c.raw.charAt(0) === '=') c.v = evalFormula(c.raw, sheet);
        else { const n = parseFloat(c.raw); c.v = (c.raw !== '' && !isNaN(n)) ? n : (c.raw || ''); }
      });
    }
  }

  /* ============================================================
   * 应用注册
   * ============================================================ */
  K.registerApp({
    id: 'office', name: 'KOffice', icon: 'office',
    gradient: ['#e2483d', '#f5732c'], pinned: true, category: '办公',
    size: { w: 1100, h: 720 },
    mount(win, args) {
      const state = { docs: [], active: null, seq: 0 };

      const menubar = el('div', { class: 'of-menubar' });
      const ribbon = el('div', { class: 'of-ribbon' });
      const tabs = el('div', { class: 'of-tabs' });
      const workspace = el('div', { class: 'of-workspace' });
      const status = el('div', { class: 'of-status' });
      const root = el('div', { class: 'office' }, [menubar, ribbon, tabs, workspace, status]);
      win.body.appendChild(root);

      /* ---------- 文档管理 ---------- */
      function newDoc(type, data, name) {
        const defaults = {
          doc: () => '<h1>未命名文档</h1><p>在此输入内容……</p>',
          sheet: () => ({ cols: 12, rows: 30, cells: {} }),
          slide: () => ({ index: 0, slides: [{ title: '新演示文稿', body: '点击编辑正文内容', bg: '#1b2a4a', fg: '#ffffff' }] }),
          pdf: () => ({ url: '', name: '' })
        };
        const d = { id: uid('doc'), type, name: name || ({ doc: '未命名文档', sheet: '未命名表格', slide: '未命名演示', pdf: 'PDF 文档' })[type], data: data != null ? data : defaults[type](), dirty: false };
        if (type === 'sheet') recalcSheet(d.data);
        state.docs.push(d);
        state.active = d.id;
        renderAll();
        return d;
      }
      function activeDoc() { return state.docs.find(d => d.id === state.active); }
      function closeDoc(id) {
        const i = state.docs.findIndex(d => d.id === id);
        if (i < 0) return;
        state.docs.splice(i, 1);
        if (state.active === id) state.active = state.docs.length ? state.docs[Math.max(0, i - 1)].id : null;
        renderAll();
      }
      function setActive(id) { syncActive(); state.active = id; renderAll(); }
      function syncActive() {
        const d = activeDoc(); if (!d) return;
        const host = workspace.querySelector('[data-editor]'); if (!host) return;
        if (d.type === 'doc') { const page = host.querySelector('.of-word-page'); if (page) d.data = page.innerHTML; }
        if (d.type === 'slide') { const s = d.data.slides[d.data.index]; const t = host.querySelector('.of-slide-title'), b = host.querySelector('.of-slide-body'); if (s && t) { s.title = t.value; s.body = b.value; } }
      }
      function markDirty() { const d = activeDoc(); if (d) { d.dirty = true; renderTabs(); updateTitle(); } }
      function updateTitle() {
        const d = activeDoc();
        win.setTitle('KOffice' + (d ? ' — ' + d.name + (d.dirty ? ' •' : '') : ''));
      }

      /* ---------- 保存 / 导出（生成真正的 .docx / .xlsx / .pptx） ---------- */
      async function saveDoc() {
        const d = activeDoc(); if (!d) return;
        syncActive();
        if (d.type === 'pdf') { K.WM.UI.alert('PDF 为只读查看，无需保存。'); return; }
        const built = buildBinary(d);
        const def = d.name.replace(/\.[^.]+$/, '') + '.' + built.ext;
        const name = await K.WM.UI.prompt('保存到「文档」文件夹，文件名：', def, '保存');
        if (!name) return;
        const content = FS.dataUrlFromBytes(built.bytes, built.mime);
        const r = FS.writeFile('/Home/Documents/' + name, content);
        if (!r.ok) { K.WM.UI.alert(r.error || '保存失败'); return; }
        d.name = name.replace(/\.[^.]+$/, ''); d.dirty = false;
        renderTabs(); updateTitle();
        K.desktop.notify({ title: 'KOffice', body: '已保存：' + name + '（可用 WPS / Office 打开）', icon: 'office' });
      }
      function exportDoc() {
        const d = activeDoc(); if (!d) return; syncActive();
        if (d.type === 'pdf') { if (d.data.url) window.open(d.data.url, '_blank'); return; }
        const built = buildBinary(d);
        download(d.name.replace(/\.[^.]+$/, '') + '.' + built.ext, built.bytes, built.mime);
      }
      function csvToSheet(text) {
        const lines = text.replace(/\r/g, '').split('\n').filter(l => l.length);
        const sheet = { cols: 12, rows: Math.max(30, lines.length + 2), cells: {} };
        lines.forEach((line, r) => {
          const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || [];
          cells.forEach((raw, c) => {
            let v = raw.replace(/,$/, '');
            if (v.charAt(0) === '"') v = v.slice(1, -1).replace(/""/g, '"');
            if (v !== '') sheet.cells[colName(c) + (r + 1)] = { raw: v, v: v };
          });
        });
        recalcSheet(sheet);
        return sheet;
      }

      /* ---------- 从文件系统打开 ---------- */
      function openFromPath(path) {
        const name = path.split('/').pop();
        const base = name.replace(/\.[^.]+$/, '');
        const ext = (name.split('.').pop() || '').toLowerCase();
        const content = FS.readFile(path) || '';
        if (ext === 'pdf') {
          if (/^data:application\/pdf/.test(content)) return newDoc('pdf', { url: content, name: base }, base);
          return newDoc('pdf', { url: '', name: base }, base);
        }
        // 真正的 Office 二进制文档（以 base64 Data URL 存储）
        if (ext === 'docx' || ext === 'xlsx' || ext === 'pptx') {
          const bin = FS.isDataUrl(content) ? FS.bytesFromDataUrl(content).bytes : strToBytes(content);
          openBinary(new Uint8Array(bin), ext, base);
          return;
        }
        // 兼容旧的 HTML / CSV / JSON 文本格式
        if (ext === 'csv' || ext === 'tsv') return newDoc('sheet', csvToSheet(content), base);
        if (ext === 'json') { try { const data = JSON.parse(content); if (data.slides) return newDoc('slide', data, base); } catch (e) { } }
        const html = ext === 'html' ? content : '<pre style="white-space:pre-wrap;font-family:inherit">' + content.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])) + '</pre>';
        return newDoc('doc', html, base);
      }
      async function openBinary(bytes, ext, base) {
        try {
          if (ext === 'pptx') return newDoc('slide', await parsePPTX(bytes), base);
          if (ext === 'xlsx') return newDoc('sheet', await parseXLSX(bytes), base);
          if (ext === 'docx') return newDoc('doc', await parseDOCX(bytes), base);
        } catch (e) {
          K.WM.UI.alert('无法打开该 Office 文件：' + (e && e.message ? e.message : e));
        }
      }

      /* ---------- 菜单栏 ---------- */
      const MENU = {
        '文件': [
          { label: '新建文字文档', act: () => newDoc('doc') },
          { label: '新建电子表格', act: () => newDoc('sheet') },
          { label: '新建演示文稿', act: () => newDoc('slide') },
          { sep: true },
          { label: '打开 PDF 文件…', act: () => pickPDF() },
          { sep: true },
          { label: '保存到文件系统', act: saveDoc },
          { label: '导出 / 下载', act: exportDoc },
          { sep: true },
          { label: '关闭当前文档', act: () => activeDoc() && closeDoc(state.active) }
        ],
        '开始': [
          { label: '撤销', act: () => document.execCommand && document.execCommand('undo') },
          { label: '重做', act: () => document.execCommand && document.execCommand('redo') },
          { sep: true },
          { label: '全选', act: () => runOnEditor('selectAll') },
          { label: '复制', act: () => document.execCommand && document.execCommand('copy') }
        ],
        '插入': [
          { label: '插入表格…', act: insertTable },
          { label: '插入图片(URL)…', act: insertImage },
          { label: '插入分页/分隔线', act: () => runOnEditor('insertHorizontalRule') }
        ],
        '视图': [
          { label: '切换到「主屏幕」', act: () => { syncActive(); state.active = null; renderAll(); } },
          { sep: true },
          { label: '放大预览 (PPT 放映)', act: presentSlides }
        ],
        '帮助': [
          { label: '关于 KOffice', act: () => K.WM.UI.alert('KOffice 内置文字处理、电子表格、演示文稿与 PDF 阅读四大模块，支持公式计算、保存到虚拟文件系统与导出下载。', '关于 KOffice') }
        ]
      };
      let openMenu = null;
      function renderMenubar() {
        menubar.innerHTML = '';
        Object.keys(MENU).forEach(name => {
          const title = el('button', { class: 'of-menu-title', text: name });
          const drop = el('div', { class: 'of-menu-drop', hidden: 'true' });
          MENU[name].forEach(it => {
            if (it.sep) return drop.appendChild(el('div', { class: 'of-menu-sep' }));
            const item = el('div', { class: 'of-menu-item', text: it.label });
            item.addEventListener('click', () => { drop.hidden = true; it.act && it.act(); });
            drop.appendChild(item);
          });
          const wrap = el('div', { class: 'of-menu' }, [title, drop]);
          title.addEventListener('click', e => {
            e.stopPropagation();
            const isOpen = !drop.hidden;
            document.querySelectorAll('.of-menu-drop').forEach(d => d.hidden = true);
            drop.hidden = isOpen;
          });
          menubar.appendChild(wrap);
        });
        menubar.appendChild(el('div', { class: 'of-menubar-brand', text: 'KOffice' }));
      }
      win.body.addEventListener('click', () => { menubar.querySelectorAll('.of-menu-drop').forEach(d => d.hidden = true); });

      /* ---------------- 编辑器操作辅助 ---------------- */
      function runOnEditor(cmd, val) { document.execCommand && document.execCommand(cmd, false, val); workspace.querySelector('[contenteditable]') && workspace.querySelector('[contenteditable]').focus(); }
      async function insertTable() {
        const rows = parseInt(await K.WM.UI.prompt('表格行数', '3', '插入表格'), 10) || 3;
        const cols = parseInt(await K.WM.UI.prompt('表格列数', '3', '插入表格'), 10) || 3;
        let html = '<table border="1" style="border-collapse:collapse"><tbody>';
        for (let r = 0; r < rows; r++) { html += '<tr>'; for (let c = 0; c < cols; c++) html += '<td style="padding:6px 10px"> </td>'; html += '</tr>'; }
        html += '</tbody></table><p></p>';
        runOnEditor('insertHTML', html);
      }
      async function insertImage() {
        const url = await K.WM.UI.prompt('图片地址 (URL)：', 'https://', '插入图片');
        if (url && url !== 'https://') runOnEditor('insertHTML', '<img src="' + url.replace(/"/g, '') + '" style="max-width:100%">');
      }

      /* ---------- 标签栏 ---------- */
      function renderTabs() {
        tabs.innerHTML = '';
        state.docs.forEach(d => {
          const tab = el('div', { class: 'of-tab' + (d.id === state.active ? ' active' : '') }, [
            el('span', { class: 'of-tab-ico', html: `<svg viewBox="0 0 24 24">${K.ICONS.office}</svg>` }),
            el('span', { class: 'of-tab-name', text: d.name + (d.dirty ? ' •' : '') }),
            (() => { const x = el('button', { class: 'of-tab-close', text: '✕' }); x.addEventListener('click', e => { e.stopPropagation(); closeDoc(d.id); }); return x; })()
          ]);
          tab.addEventListener('click', () => d.id !== state.active && setActive(d.id));
          tabs.appendChild(tab);
        });
        if (state.docs.length) {
          const add = el('button', { class: 'of-tab-add', text: '+' });
          add.addEventListener('click', e => { e.stopPropagation(); showNewMenu(add); });
          tabs.appendChild(add);
        } else {
          tabs.appendChild(el('div', { class: 'of-tab-empty', text: '尚无打开的文档' }));
        }
      }
      function showNewMenu(anchor) {
        const r = anchor.getBoundingClientRect();
        const items = [['doc', '文字'], ['sheet', '表格'], ['slide', '演示'], ['pdf', 'PDF']];
        const menu = el('div', { class: 'of-newmenu' });
        items.forEach(([t, label]) => {
          if (t === 'pdf') { const it = el('div', { class: 'of-menu-item', text: '打开 PDF…' }); it.addEventListener('click', () => { menu.remove(); pickPDF(); }); menu.appendChild(it); return; }
          const it = el('div', { class: 'of-menu-item', text: '新建' + label }); it.addEventListener('click', () => { menu.remove(); newDoc(t); }); menu.appendChild(it);
        });
        document.body.appendChild(menu);
        menu.style.left = r.left + 'px'; menu.style.top = (r.bottom + 4) + 'px';
        setTimeout(() => document.addEventListener('click', function h() { menu.remove(); document.removeEventListener('click', h); }), 0);
      }

      /* ---------- 工作区渲染 ---------- */
      function renderWorkspace() {
        workspace.innerHTML = '';
        ribbon.style.display = '';
        const d = activeDoc();
        if (!d) { ribbon.style.display = 'none'; workspace.appendChild(buildHome()); renderRibbon(); return; }
        if (d.type === 'doc') workspace.appendChild(buildWord(d));
        else if (d.type === 'sheet') workspace.appendChild(buildSheet(d));
        else if (d.type === 'slide') workspace.appendChild(buildSlide(d));
        else if (d.type === 'pdf') workspace.appendChild(buildPDF(d));
        renderRibbon();
      }

      function buildHome() {
        const wrap = el('div', { class: 'of-home' });
        wrap.appendChild(el('div', { class: 'of-home-head' }, [
          el('img', { src: 'assets/logo.png', class: 'of-home-logo' }),
          el('div', {}, [
            el('h1', { text: 'KOffice' }),
            el('p', { text: '选择一种文档类型开始创作，所有内容都在本地处理。' })
          ])
        ]));
        const templates = [
          { t: 'doc', name: '文字文档', sub: 'Word 风格的富文本编辑', color: ['#2b6cff', '#4f9bff'], icon: '<path d="M6 2h8l4 4v16H6V2zm7 1.5V7h3.5L13 3.5zM8 11h8v1.5H8V11zm0 4h8v1.5H8V15zm0-8h5v1.5H8V7z"/>' },
          { t: 'sheet', name: '电子表格', sub: '支持公式与函数计算', color: ['#109d58', '#2fbf7a'], icon: '<path d="M4 4h16v16H4V4zm2 3v3h3V7H6zm5 0v3h3V7h-3zm5 0v3h3V7h-3zM6 12v3h3v-3H6zm5 0v3h3v-3h-3zm5 0v3h3v-3h-3z"/>' },
          { t: 'slide', name: '演示文稿', sub: '幻灯片编辑与全屏放映', color: ['#e2483d', '#f5732c'], icon: '<path d="M3 5h18v11H3V5zm2 2v7h14V7H5zm-2 11h18v1.5H3V18z"/>' },
          { t: 'pdf', name: 'PDF 阅读', sub: '打开并查看 PDF 文件', color: ['#8a4bff', '#b07bff'], icon: '<path d="M6 2h8l4 4v16H6V2zm7 1.5V7h3.5L13 3.5zM8 11h2v2H8v-2zm3 0h5v1.5h-5V11zm0 3h5v1.5h-5V14z"/>' }
        ];
        const grid = el('div', { class: 'of-home-grid' });
        templates.forEach(tp => {
          const card = el('div', { class: 'of-home-card' }, [
            el('div', { class: 'of-home-ico', style: { background: `linear-gradient(145deg,${tp.color[0]},${tp.color[1]})` }, html: `<svg viewBox="0 0 24 24">${tp.icon}</svg>` }),
            el('div', { class: 'of-home-ct' }, [el('div', { class: 'of-home-name', text: tp.name }), el('div', { class: 'of-home-sub', text: tp.sub })])
          ]);
          card.addEventListener('click', () => tp.t === 'pdf' ? pickPDF() : newDoc(tp.t));
          grid.appendChild(card);
        });
        wrap.appendChild(grid);
        if (state.docs.length) {
          wrap.appendChild(el('div', { class: 'of-home-sec', text: '本次会话已打开' }));
          const list = el('div', { class: 'of-home-recent' });
          state.docs.forEach(d => { const it = el('div', { class: 'of-home-recitem', text: d.name }); it.addEventListener('click', () => setActive(d.id)); list.appendChild(it); });
          wrap.appendChild(list);
        }
        return wrap;
      }

      /* ---------- Word ---------- */
      function buildWord(d) {
        const page = el('div', { class: 'of-word-page', contenteditable: 'true', spellcheck: 'false' });
        page.innerHTML = d.data || '';
        page.addEventListener('input', () => { d.data = page.innerHTML; markDirty(); });
        const wrap = el('div', { class: 'of-word', 'data-editor': '1' }, [page]);
        return wrap;
      }

      /* ---------- Excel ---------- */
      function buildSheet(d) {
        const sheet = d.data;
        const sel = { r: 1, c: 0, ref: 'A1' };
        let editing = null;

        const fbarRef = el('div', { class: 'of-fref', text: 'A1' });
        const fbarInput = el('input', { class: 'of-finput', type: 'text', placeholder: '输入内容或公式，如 =SUM(A1:A5)' });
        const fbar = el('div', { class: 'of-fbar' }, [fbarRef, el('span', { class: 'of-fx', text: 'fx' }), fbarInput]);

        const grid = el('div', { class: 'of-grid' });
        const scroll = el('div', { class: 'of-sheet-scroll' }, [grid]);
        const wrap = el('div', { class: 'of-sheet', 'data-editor': '1' }, [fbar, scroll]);

        function cellAt(c, r) { return sheet.cells[colName(c) + r]; }
        function displayOf(c, r) { const cell = cellAt(c, r); if (!cell) return ''; return cell.v == null ? '' : String(cell.v); }
        function refOf(c, r) { return colName(c) + r; }
        function setCell(c, r, raw) {
          const ref = refOf(c, r);
          if (raw === '') delete sheet.cells[ref];
          else sheet.cells[ref] = { raw: String(raw), v: raw };
          recalcSheet(sheet);
          d.dirty = true; paintGrid(); renderTabs(); updateTitle();
        }

        function paintGrid() {
          grid.innerHTML = '';
          // 列头
          grid.appendChild(el('div', { class: 'of-corner' }));
          for (let c = 0; c < sheet.cols; c++) grid.appendChild(el('div', { class: 'of-colh', text: colName(c) }));
          for (let r = 1; r <= sheet.rows; r++) {
            grid.appendChild(el('div', { class: 'of-rowh', text: String(r) }));
            for (let c = 0; c < sheet.cols; c++) {
              const ref = refOf(c, r);
              const cell = el('div', { class: 'of-cell' + (ref === sel.ref ? ' sel' : ''), 'data-c': c, 'data-r': r, text: displayOf(c, r) });
              if (typeof cellAt(c, r)?.v === 'number') cell.classList.add('num');
              grid.appendChild(cell);
            }
          }
          grid.style.gridTemplateColumns = '44px repeat(' + sheet.cols + ', 92px)';
        }

        function selectCell(c, r) {
          sel.c = c; sel.r = r; sel.ref = refOf(c, r);
          fbarRef.textContent = sel.ref;
          const cell = cellAt(c, r);
          fbarInput.value = cell ? cell.raw : '';
          grid.querySelectorAll('.of-cell.sel').forEach(n => n.classList.remove('sel'));
          const node = grid.querySelector(`.of-cell[data-c="${c}"][data-r="${r}"]`);
          if (node) node.classList.add('sel');
        }

        grid.addEventListener('mousedown', e => {
          const cell = e.target.closest('.of-cell'); if (!cell) return;
          if (editing) return;
          selectCell(+cell.dataset.c, +cell.dataset.r);
        });
        grid.addEventListener('dblclick', e => {
          const cell = e.target.closest('.of-cell'); if (!cell) return;
          startEdit(+cell.dataset.c, +cell.dataset.r);
        });
        function startEdit(c, r) {
          const node = grid.querySelector(`.of-cell[data-c="${c}"][data-r="${r}"]`); if (!node) return;
          const cell = cellAt(c, r);
          node.textContent = cell ? cell.raw : '';
          node.setAttribute('contenteditable', 'true');
          node.focus();
          const rng = document.createRange(); rng.selectNodeContents(node); rng.collapse(false);
          const s = window.getSelection(); s.removeAllRanges(); s.addRange(rng);
          editing = node;
          node.addEventListener('keydown', onEditKey);
          node.addEventListener('blur', () => commitEdit(c, r, node), { once: true });
        }
        function onEditKey(e) {
          if (e.key === 'Enter') { e.preventDefault(); editing && editing.blur(); }
          if (e.key === 'Tab') { e.preventDefault(); editing && editing.blur(); selectCell(Math.min(sel.c + 1, sheet.cols - 1), sel.r); }
          if (e.key === 'Escape') { editing && editing.blur(); }
        }
        function commitEdit(c, r, node) {
          const raw = node.textContent.replace(/\n/g, '');
          node.removeAttribute('contenteditable');
          editing = null;
          setCell(c, r, raw);
          selectCell(c, r);
        }

        fbarInput.addEventListener('keydown', e => {
          if (e.key === 'Enter') { setCell(sel.c, sel.r, fbarInput.value); selectCell(sel.c, sel.r); workspace.querySelector('.of-sheet').focus(); }
        });

        // 键盘导航
        wrap.tabIndex = 0;
        wrap.addEventListener('keydown', e => {
          if (editing) return;
          const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
          if (map[e.key]) {
            e.preventDefault();
            let c = sel.c + map[e.key][0], r = sel.r + map[e.key][1];
            c = Math.max(0, Math.min(sheet.cols - 1, c)); r = Math.max(1, Math.min(sheet.rows, r));
            selectCell(c, r); scrollIntoCell(c, r);
          }
          if (e.key === 'Enter' && !editing) { e.preventDefault(); startEdit(sel.c, sel.r); }
        });
        function scrollIntoCell(c, r) { const node = grid.querySelector(`.of-cell[data-c="${c}"][data-r="${r}"]`); if (node) node.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }

        // 暴露给 ribbon 的操作
        wrap.__sheet = { get sheet() { return sheet; }, get sel() { return sel; }, setCell, paintGrid, selectCell, refresh: () => { recalcSheet(sheet); paintGrid(); selectCell(sel.c, sel.r); } };

        paintGrid(); selectCell(0, 1);
        return wrap;
      }

      /* ---------- PPT ---------- */
      function buildSlide(d) {
        const data = d.data;
        const list = el('div', { class: 'of-slide-list' });
        const stage = el('div', { class: 'of-slide-stage' });
        const wrap = el('div', { class: 'of-ppt', 'data-editor': '1' }, [list, stage]);

        function renderList() {
          list.innerHTML = '';
          data.slides.forEach((s, i) => {
            const th = el('div', { class: 'of-slide-thumb' + (i === data.index ? ' active' : '') }, [
              el('div', { class: 'of-slide-num', text: String(i + 1) }),
              el('div', { class: 'of-slide-mini', style: { background: s.bg, color: s.fg } }, [el('div', { class: 'mini-t', text: desc(s.title) })])
            ]);
            th.addEventListener('click', () => { syncActive(); data.index = i; renderList(); renderStage(); });
            list.appendChild(th);
          });
          const add = el('button', { class: 'of-slide-add', text: '+ 新建幻灯片' });
          add.addEventListener('click', () => { syncActive(); data.slides.push({ title: '新幻灯片', body: '', bg: data.slides[data.index]?.bg || '#1b2a4a', fg: '#ffffff' }); data.index = data.slides.length - 1; markDirty(); renderList(); renderStage(); });
          list.appendChild(add);
        }
        function renderStage() {
          stage.innerHTML = '';
          const s = data.slides[data.index];
          if (!s) { stage.appendChild(el('div', { class: 'of-slide-empty', text: '没有幻灯片' })); return; }
          const slide = el('div', { class: 'of-slide', style: { background: s.bg, color: s.fg } }, [
            el('textarea', { class: 'of-slide-title', rows: '1', text: s.title || '' }),
            el('textarea', { class: 'of-slide-body', rows: '4', text: s.body || '' })
          ]);
          const t = slide.querySelector('.of-slide-title'), b = slide.querySelector('.of-slide-body');
          [t, b].forEach(inp => inp.addEventListener('input', () => { s.title = t.value; s.body = b.value; markDirty(); renderList(); }));
          stage.appendChild(slide);
        }
        renderList(); renderStage();
        wrap.__slide = { data, renderList, renderStage };
        return wrap;
      }

      function presentSlides() {
        const d = activeDoc(); if (!d || d.type !== 'slide') { K.WM.UI.alert('请先打开一个演示文稿。'); return; }
        syncActive();
        let i = 0;
        const overlay = el('div', { class: 'of-present' });
        function draw() {
          const s = d.data.slides[i]; if (!s) return;
          overlay.innerHTML = '';
          overlay.appendChild(el('div', { class: 'of-present-slide', style: { background: s.bg, color: s.fg } }, [
            el('div', { class: 'of-present-title', text: s.title || '' }),
            el('div', { class: 'of-present-body', text: s.body || '' })
          ]));
          overlay.appendChild(el('div', { class: 'of-present-hint', text: (i + 1) + ' / ' + d.data.slides.length + '　← → 翻页，Esc 退出' }));
        }
        overlay.addEventListener('click', e => { if (e.clientX > window.innerWidth / 2) { i = Math.min(i + 1, d.data.slides.length - 1); } else { i = Math.max(i - 1, 0); } draw(); });
        document.addEventListener('keydown', key);
        function key(e) {
          if (e.key === 'ArrowRight') { i = Math.min(i + 1, d.data.slides.length - 1); draw(); }
          if (e.key === 'ArrowLeft') { i = Math.max(i - 1, 0); draw(); }
          if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', key); }
        }
        document.body.appendChild(overlay); draw();
      }

      /* ---------- PDF ---------- */
      function pickPDF() {
        const input = el('input', { type: 'file', accept: 'application/pdf,.pdf' });
        input.style.display = 'none';
        document.body.appendChild(input);
        input.addEventListener('change', () => {
          const f = input.files && input.files[0];
          if (f) { const url = URL.createObjectURL(f); newDoc('pdf', { url, name: f.name.replace(/\.[^.]+$/, '') }, f.name.replace(/\.[^.]+$/, '')); }
          input.remove();
        });
        input.click();
      }
      function buildPDF(d) {
        const wrap = el('div', { class: 'of-pdf', 'data-editor': '1' });
        if (d.data.url) {
          const frame = el('iframe', { class: 'of-pdf-frame', src: d.data.url });
          wrap.appendChild(el('div', { class: 'of-pdf-bar' }, [
            el('span', { class: 'of-pdf-name', text: d.data.name || 'PDF' }),
            (() => { const b = el('button', { class: 'btn', text: '在新窗口打开' }); b.addEventListener('click', () => window.open(d.data.url, '_blank')); return b; })()
          ]));
          wrap.appendChild(frame);
        } else {
          const drop = el('div', { class: 'of-pdf-drop' }, [
            el('div', { class: 'of-pdf-ico', html: `<svg viewBox="0 0 24 24">${K.ICONS.office}</svg>` }),
            el('h3', { text: '打开 PDF 文件' }),
            el('p', { text: '点击选择，或将 PDF 文件拖拽到此处（本地查看，不上传）。' }),
            (() => { const b = el('button', { class: 'btn primary', text: '选择 PDF 文件' }); b.addEventListener('click', pickPDF); return b; })()
          ]);
          drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
          drop.addEventListener('dragleave', () => drop.classList.remove('over'));
          drop.addEventListener('drop', e => {
            e.preventDefault(); drop.classList.remove('over');
            const f = e.dataTransfer.files && e.dataTransfer.files[0];
            if (f) { const url = URL.createObjectURL(f); d.data.url = url; d.data.name = f.name; renderWorkspace(); }
          });
          wrap.appendChild(drop);
        }
        return wrap;
      }

      /* ---------- 功能区（Ribbon） ---------- */
      function rbtn(label, title, act, opts) {
        const b = el('button', { class: 'of-rbtn' + (opts && opts.cls ? ' ' + opts.cls : ''), title: title || label, html: (opts && opts.html ? opts.html : '') + (label ? `<span>${label}</span>` : '') });
        b.addEventListener('click', e => { e.preventDefault(); act(); });
        return b;
      }
      function rgroup(label, children) { return el('div', { class: 'of-rgroup' }, [el('div', { class: 'of-rgroup-btns' }, children), el('div', { class: 'of-rgroup-label', text: label })]); }
      function renderRibbon() {
        ribbon.innerHTML = '';
        const d = activeDoc(); if (!d) return;
        const B = (s) => `<svg viewBox="0 0 24 24" class="ri">${K.ICONS[s]}</svg>`;

        if (d.type === 'doc') {
          const style = el('select', { class: 'of-select' });
          [['p', '正文'], ['h1', '标题 1'], ['h2', '标题 2'], ['h3', '标题 3'], ['blockquote', '引用']].forEach(([v, t]) => style.appendChild(el('option', { value: v, text: t })));
          style.addEventListener('change', () => { runOnEditor('formatBlock', style.value === 'p' ? 'p' : style.value); });
          const size = el('select', { class: 'of-select' });
          [['2', '小'], ['3', '正常'], ['4', '中'], ['5', '大'], ['6', '特大']].forEach(([v, t]) => size.appendChild(el('option', { value: v, text: t, selected: v === '3' ? 'true' : null })));
          size.addEventListener('change', () => runOnEditor('fontSize', size.value));
          const color = el('input', { type: 'color', class: 'of-color', value: '#1b2a4a' });
          color.addEventListener('input', () => runOnEditor('foreColor', color.value));
          ribbon.append(
            rgroup('剪贴板', [rbtn('', '撤销', () => runOnEditor('undo'), { html: B('media') }), rbtn('', '重做', () => runOnEditor('redo'), { html: B('media') })]),
            rgroup('字体', [style, size, rbtn('B', '加粗', () => runOnEditor('bold'), { cls: 'bold' }), rbtn('I', '斜体', () => runOnEditor('italic'), { cls: 'italic' }), rbtn('U', '下划线', () => runOnEditor('underline'), { cls: 'underline' }), rbtn('S', '删除线', () => runOnEditor('strikeThrough'), { cls: 'strike' }), color]),
            rgroup('段落', [rbtn('', '左对齐', () => runOnEditor('justifyLeft'), { html: B('editor') }), rbtn('', '居中', () => runOnEditor('justifyCenter'), { html: B('editor') }), rbtn('', '右对齐', () => runOnEditor('justifyRight'), { html: B('editor') }), rbtn('', '项目符号', () => runOnEditor('insertUnorderedList'), { html: B('editor') }), rbtn('', '编号', () => runOnEditor('insertOrderedList'), { html: B('editor') })]),
            rgroup('插入', [rbtn('表格', '插入表格', insertTable), rbtn('图片', '插入图片', insertImage), rbtn('分隔线', '插入分隔线', () => runOnEditor('insertHorizontalRule'))]),
            rgroup('文件', [rbtn('保存', '保存到文件系统', saveDoc), rbtn('导出', '导出下载', exportDoc)])
          );
        } else if (d.type === 'sheet') {
          const host = workspace.querySelector('.of-sheet');
          ribbon.append(
            rgroup('编辑', [
              rbtn('Σ 求和', '对选中单元格求和', () => { const s = host.__sheet; K.WM.UI.prompt('输入求和范围，如 A1:A5', '', 'SUM').then(r => { if (r) { s.setCell(s.sel.c, s.sel.r, '=SUM(' + r + ')'); } }); }),
              rbtn('加粗', '加粗', () => { const cell = host.__sheet.sheet.cells[host.__sheet.sel.ref]; if (cell) { cell.bold = !cell.bold; host.__sheet.refresh(); } }),
              rbtn('清空', '清空选中单元格', () => { const s = host.__sheet; s.setCell(s.sel.c, s.sel.r, ''); })
            ]),
            rgroup('行列', [
              rbtn('插入行', '在下方插入一行', () => { const s = host.__sheet; s.sheet.rows++; s.refresh(); }),
              rbtn('插入列', '在右侧插入一列', () => { const s = host.__sheet; s.sheet.cols = Math.min(s.sheet.cols + 1, 26); s.refresh(); }),
              rbtn('删除行', '删除末行', () => { const s = host.__sheet; if (s.sheet.rows > 1) { s.sheet.rows--; s.refresh(); } }),
              rbtn('删除列', '删除末列', () => { const s = host.__sheet; if (s.sheet.cols > 1) { s.sheet.cols--; s.refresh(); } })
            ]),
            rgroup('文件', [rbtn('保存', '保存为 CSV', saveDoc), rbtn('导出', '导出 CSV', exportDoc)])
          );
        } else if (d.type === 'slide') {
          const host = workspace.querySelector('.of-ppt');
          const d2 = d.data;
          const bg = el('input', { type: 'color', class: 'of-color', value: d2.slides[d2.index]?.bg || '#1b2a4a' });
          bg.addEventListener('input', () => { const s = d2.slides[d2.index]; if (s) { s.bg = bg.value; host.__slide.renderStage(); host.__slide.renderList(); markDirty(); } });
          const fg = el('input', { type: 'color', class: 'of-color', value: '#ffffff' });
          fg.addEventListener('input', () => { const s = d2.slides[d2.index]; if (s) { s.fg = fg.value; host.__slide.renderStage(); markDirty(); } });
          ribbon.append(
            rgroup('幻灯片', [
              rbtn('新建', '新建幻灯片', () => { d2.slides.push({ title: '新幻灯片', body: '', bg: '#1b2a4a', fg: '#ffffff' }); d2.index = d2.slides.length - 1; markDirty(); host.__slide.renderList(); host.__slide.renderStage(); }),
              rbtn('删除', '删除当前幻灯片', () => { if (d2.slides.length > 1) { d2.slides.splice(d2.index, 1); d2.index = Math.max(0, d2.index - 1); markDirty(); host.__slide.renderList(); host.__slide.renderStage(); } }),
              rbtn('上移', '上移', () => { if (d2.index > 0) { const s = d2.slides.splice(d2.index, 1)[0]; d2.slides.splice(--d2.index, 0, s); markDirty(); host.__slide.renderList(); host.__slide.renderStage(); } }),
              rbtn('下移', '下移', () => { if (d2.index < d2.slides.length - 1) { const s = d2.slides.splice(d2.index, 1)[0]; d2.slides.splice(++d2.index, 0, s); markDirty(); host.__slide.renderList(); host.__slide.renderStage(); } })
            ]),
            rgroup('样式', [el('span', { class: 'of-rlbl', text: '背景' }), bg, el('span', { class: 'of-rlbl', text: '文字' }), fg]),
            rgroup('放映', [rbtn('▶ 放映', '全屏放映', presentSlides)]),
            rgroup('文件', [rbtn('保存', '保存到文件系统', saveDoc), rbtn('导出', '导出 JSON', exportDoc)])
          );
        } else if (d.type === 'pdf') {
          ribbon.append(
            rgroup('文档', [rbtn('打开 PDF', '选择本地 PDF', pickPDF), rbtn('新窗口打开', '在新窗口打开', () => d.data.url && window.open(d.data.url, '_blank'))]),
            rgroup('页面', [rbtn('打印', '打印当前 PDF', () => { const f = workspace.querySelector('.of-pdf-frame'); if (f) { try { f.contentWindow.print(); } catch (e) { window.open(d.data.url, '_blank'); } } })])
          );
        }
      }

      /* ---------- 状态栏 ---------- */
      function renderStatus() {
        status.innerHTML = '';
        const d = activeDoc();
        const label = { doc: '文字文档', sheet: '电子表格', slide: '演示文稿', pdf: 'PDF 文档' }[d ? d.type : ''] || '就绪';
        status.append(
          el('span', { class: 'of-status-item', text: 'KOffice' }),
          el('span', { class: 'of-status-item', text: label }),
          el('span', { class: 'of-status-spacer' }),
          el('span', { class: 'of-status-item', text: d ? (d.dirty ? '未保存' : '已保存') : '' })
        );
      }

      function renderAll() { renderTabs(); renderWorkspace(); renderStatus(); updateTitle(); }

      /* ---------- 初始化 ---------- */
      renderMenubar();
      if (args && args.path) openFromPath(args.path);
      else renderAll();

      win.cleanups.push(() => { document.querySelectorAll('.of-newmenu').forEach(n => n.remove()); });
    }
  });
})();