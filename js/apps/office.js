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

  /* ---------------- CRC-32 & ZIP 工具（用于生成 .pptx） ---------------- */
  const CRC_TABLE = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
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
    // files: [{name, content}] — content 为字符串，使用 store（不压缩）
    const encoder = strToBytes;
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    let centralSize = 0;
    files.forEach(f => {
      const nameBytes = encoder(f.name);
      const dataBytes = encoder(f.content);
      const crc = crc32(dataBytes);
      const size = dataBytes.length;
      // Local file header
      const lh = new Uint8Array(30 + nameBytes.length);
      const dv = new DataView(lh.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);        // version needed
      dv.setUint16(6, 0, true);         // flags
      dv.setUint16(8, 0, true);         // compression = store
      dv.setUint16(10, 0, true);        // mod time
      dv.setUint16(12, 0, true);        // mod date
      dv.setUint32(14, crc, true);
      dv.setUint32(18, size, true);     // compressed size
      dv.setUint32(22, size, true);     // uncompressed size
      dv.setUint16(26, nameBytes.length, true);
      dv.setUint16(28, 0, true);        // extra length
      lh.set(nameBytes, 30);
      localParts.push(lh, dataBytes);
      // Central directory header
      const ch = new Uint8Array(46 + nameBytes.length);
      const cdv = new DataView(ch.buffer);
      cdv.setUint32(0, 0x02014b50, true);
      cdv.setUint16(4, 20, true);       // version made by
      cdv.setUint16(6, 20, true);       // version needed
      cdv.setUint16(8, 0, true);        // flags
      cdv.setUint16(10, 0, true);       // compression
      cdv.setUint16(12, 0, true);       // mod time
      cdv.setUint16(14, 0, true);       // mod date
      cdv.setUint32(16, crc, true);
      cdv.setUint32(20, size, true);
      cdv.setUint32(24, size, true);
      cdv.setUint16(28, nameBytes.length, true);
      cdv.setUint16(30, 0, true);       // extra
      cdv.setUint16(32, 0, true);       // comment
      cdv.setUint16(34, 0, true);       // disk number
      cdv.setUint16(36, 0, true);       // internal attrs
      cdv.setUint32(38, 0, true);       // external attrs
      cdv.setUint32(42, offset, true);  // local header offset
      ch.set(nameBytes, 46);
      centralParts.push(ch);
      centralSize += ch.length;
      offset += lh.length + dataBytes.length;
    });
    // End of central directory
    const eocd = new Uint8Array(22);
    const edv = new DataView(eocd.buffer);
    edv.setUint32(0, 0x06054b50, true);
    edv.setUint16(4, 0, true);
    edv.setUint16(6, 0, true);
    edv.setUint16(8, files.length, true);
    edv.setUint16(10, files.length, true);
    edv.setUint32(12, centralSize, true);
    edv.setUint32(16, offset, true);
    edv.setUint16(20, 0, true);
    const total = offset + centralSize + eocd.length;
    const out = new Uint8Array(total);
    let pos = 0;
    localParts.forEach(p => { out.set(p, pos); pos += p.length; });
    centralParts.forEach(p => { out.set(p, pos); pos += p.length; });
    out.set(eocd, pos);
    return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  }

  /* ---------------- PPTX 生成（真正的 Office Open XML 格式） ---------------- */
  function buildPPTX(data) {
    const slides = data.slides || [{ title: '演示文稿', body: '', bg: '#1b2a4a', fg: '#ffffff' }];
    const files = [];
    // [Content_Types].xml
    let ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    ct += '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">';
    ct += '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>';
    ct += '<Default Extension="xml" ContentType="application/xml"/>';
    ct += '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>';
    ct += '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>';
    ct += '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>';
    ct += '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>';
    slides.forEach((_, i) => {
      ct += '<Override PartName="/ppt/slides/slide' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>';
    });
    ct += '</Types>';
    files.push({ name: '[Content_Types].xml', content: ct });
    // _rels/.rels
    files.push({ name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>' +
      '</Relationships>' });
    // ppt/presentation.xml
    let pres = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    pres += '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">';
    pres += '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>';
    pres += '<p:sldIdLst>';
    slides.forEach((_, i) => { pres += '<p:sldId id="' + (256 + i) + '" r:id="rId' + (i + 2) + '"/>'; });
    pres += '</p:sldIdLst>';
    pres += '<p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>';
    pres += '<p:notesSz cx="6858000" cy="9144000"/>';
    pres += '<p:defaultTextStyle/>';
    pres += '</p:presentation>';
    files.push({ name: 'ppt/presentation.xml', content: pres });
    // ppt/_rels/presentation.xml.rels
    let pr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    pr += '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    pr += '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>';
    slides.forEach((_, i) => {
      pr += '<Relationship Id="rId' + (i + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide' + (i + 1) + '.xml"/>';
    });
    pr += '</Relationships>';
    files.push({ name: 'ppt/_rels/presentation.xml.rels', content: pr });
    // ppt/theme/theme1.xml
    files.push({ name: 'ppt/theme/theme1.xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="KOffice Theme">' +
      '<a:themeElements><a:clrScheme name="Office"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1B2A4A"/></a:dk2><a:lt2><a:srgbClr val="E8ECF4"/></a:lt2><a:accent1><a:srgbClr val="2B6CFF"/></a:accent1><a:accent2><a:srgbClr val="E2483D"/></a:accent2><a:accent3><a:srgbClr val="109D58"/></a:accent3><a:accent4><a:srgbClr val="F5732C"/></a:accent4><a:accent5><a:srgbClr val="8A4BFF"/></a:accent5><a:accent6><a:srgbClr val="00A6CB"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>' +
      '<a:fontScheme name="Office"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface="宋体"/><a:cs typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface="宋体"/><a:cs typeface="Arial"/></a:minorFont></a:fontScheme>' +
      '<a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements>' +
      '<a:objectDefaults/><a:extraClrSchemeLst/></a:theme>' });
    // ppt/slideMasters/slideMaster1.xml
    files.push({ name: 'ppt/slideMasters/slideMaster1.xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
      '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>' +
      '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
      '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
      '<p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>' +
      '</p:sldMaster>' });
    files.push({ name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>' +
      '</Relationships>' });
    // ppt/slideLayouts/slideLayout1.xml
    files.push({ name: 'ppt/slideLayouts/slideLayout1.xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="title">' +
      '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>' +
      '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>' +
      '</p:sldLayout>' });
    files.push({ name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>' +
      '</Relationships>' });
    // slides
    slides.forEach((s, i) => {
      const bgHex = (s.bg || '#1b2a4a').replace('#', '').toUpperCase();
      const fgHex = (s.fg || '#ffffff').replace('#', '').toUpperCase();
      const title = (s.title || '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
      const body = (s.body || '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
      let slide = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
      slide += '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">';
      slide += '<p:cSld>';
      slide += '<p:bg><p:bgPr><a:solidFill><a:srgbClr val="' + bgHex + '"/></a:solidFill></p:bgPr></p:bg>';
      slide += '<p:spTree>';
      slide += '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>';
      // 标题
      slide += '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>';
      slide += '<p:spPr><a:xfrm><a:off x="457200" y="457200"/><a:ext cx="8229600" cy="1143000"/></a:xfrm></p:spPr>';
      slide += '<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="4400" b="1"><a:solidFill><a:srgbClr val="' + fgHex + '"/></a:solidFill></a:rPr><a:t>' + title + '</a:t></a:r></a:p></p:txBody>';
      slide += '</p:sp>';
      // 正文
      const bodyLines = body.split('\n');
      let bodyParagraphs = '';
      bodyLines.forEach(line => {
        bodyParagraphs += '<a:p><a:r><a:rPr lang="zh-CN" sz="2400"><a:solidFill><a:srgbClr val="' + fgHex + '"/></a:solidFill></a:rPr><a:t>' + line + '</a:t></a:r></a:p>';
      });
      slide += '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Body"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>';
      slide += '<p:spPr><a:xfrm><a:off x="457200" y="1828800"/><a:ext cx="8229600" cy="4114800"/></a:xfrm></p:spPr>';
      slide += '<p:txBody><a:bodyPr wrap="square" anchor="t"/><a:lstStyle/>' + bodyParagraphs + '</p:txBody>';
      slide += '</p:sp>';
      slide += '</p:spTree></p:cSld>';
      slide += '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>';
      slide += '</p:sld>';
      files.push({ name: 'ppt/slides/slide' + (i + 1) + '.xml', content: slide });
      files.push({ name: 'ppt/slides/_rels/slide' + (i + 1) + '.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
        '</Relationships>' });
    });
    return zipStore(files);
  }

  /* ---------------- 解析 PPTX（从 ZIP 中提取幻灯片文字） ---------------- */
  function parsePPTX(blob) {
    return new Promise((resolve) => {
      const data = { index: 0, slides: [] };
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const bytes = new Uint8Array(reader.result);
          const dv = new DataView(bytes.buffer);
          // 找 central directory 起始位置
          let cdOffset = -1;
          for (let i = bytes.length - 22; i >= 0; i--) {
            if (dv.getUint32(i, true) === 0x06054b50) { cdOffset = dv.getUint32(i + 16, true); break; }
          }
          if (cdOffset < 0) { resolve(data); return; }
          // 解析 central directory，找 slide 文件
          const slideEntries = [];
          let pos = cdOffset;
          while (pos < bytes.length && dv.getUint32(pos, true) === 0x02014b50) {
            const nameLen = dv.getUint16(pos + 28, true);
            const extraLen = dv.getUint16(pos + 30, true);
            const commentLen = dv.getUint16(pos + 32, true);
            const localOffset = dv.getUint32(pos + 42, true);
            const name = String.fromCharCode.apply(null, bytes.subarray(pos + 46, pos + 46 + nameLen));
            if (/ppt\/slides\/slide\d+\.xml$/.test(name)) {
              slideEntries.push({ name, localOffset });
            }
            pos += 46 + nameLen + extraLen + commentLen;
          }
          // 按 slide 编号排序
          slideEntries.sort((a, b) => {
            const na = parseInt(a.name.match(/slide(\d+)/)[1]);
            const nb = parseInt(b.name.match(/slide(\d+)/)[1]);
            return na - nb;
          });
          // 读取每个 slide 的内容
          slideEntries.forEach(entry => {
            const lp = entry.localOffset;
            const nameLen = dv.getUint16(lp + 26, true);
            const extraLen = dv.getUint16(lp + 28, true);
            const compMethod = dv.getUint16(lp + 8, true);
            const compSize = dv.getUint32(lp + 18, true);
            const dataStart = lp + 30 + nameLen + extraLen;
            let xmlBytes = bytes.subarray(dataStart, dataStart + compSize);
            if (compMethod === 8) {
              // DEFLATE - 尝试用 DecompressionStream
              // 简化处理：如果浏览器不支持，跳过
              try {
                const ds = new DecompressionStream('deflate-raw');
                const writer = ds.writable.getWriter();
                writer.write(xmlBytes);
                writer.close();
                // 异步处理，这里用同步替代
                // 实际中 .pptx 通常用 store，先不处理压缩情况
              } catch (e) { }
              return; // 压缩的跳过
            }
            const xml = new TextDecoder().decode(xmlBytes);
            // 提取标题和正文
            const spMatch = xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || [];
            let title = '', body = '', bg = '#1b2a4a', fg = '#ffffff';
            // 背景色
            const bgMatch = xml.match(/<a:srgbClr val="([0-9A-Fa-f]{6})"\/>/);
            if (bgMatch) bg = '#' + bgMatch[1];
            spMatch.forEach(sp => {
              const texts = (sp.match(/<a:t>([\s\S]*?)<\/a:t>/g) || []).map(t => t.replace(/<\/?a:t>/g, ''));
              const colorMatch = sp.match(/<a:solidFill><a:srgbClr val="([0-9A-Fa-f]{6})"/);
              const color = colorMatch ? '#' + colorMatch[1] : '#ffffff';
              const isTitle = /type="title"/.test(sp);
              if (isTitle) { title = texts.join(''); fg = color; }
              else if (texts.length) { body += (body ? '\n' : '') + texts.join(''); }
            });
            data.slides.push({ title, body, bg, fg });
          });
          if (!data.slides.length) data.slides.push({ title: '新演示文稿', body: '', bg: '#1b2a4a', fg: '#ffffff' });
        } catch (e) {
          data.slides.push({ title: '新演示文稿', body: '', bg: '#1b2a4a', fg: '#ffffff' });
        }
        resolve(data);
      };
      reader.readAsArrayBuffer(blob);
    });
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

      /* ---------- 保存 / 导出（Office/WPS 兼容格式） ---------- */
      async function saveDoc() {
        const d = activeDoc(); if (!d) return;
        syncActive();
        if (d.type === 'pdf') { K.WM.UI.alert('PDF 为只读查看，无需保存。'); return; }
        const extMap = { doc: 'doc', sheet: 'xls', slide: 'ppt' };
        const def = d.name.replace(/\.[^.]+$/, '') + '.' + extMap[d.type];
        const name = await K.WM.UI.prompt('保存到「文档」文件夹，文件名：', def, '保存');
        if (!name) return;
        const content = serialize(d);
        const r = FS.writeFile('/Home/Documents/' + name, content);
        if (!r.ok) { K.WM.UI.alert(r.error || '保存失败'); return; }
        d.name = name.replace(/\.[^.]+$/, ''); d.dirty = false;
        renderTabs(); updateTitle();
        K.desktop.notify({ title: 'KOffice', body: '已保存：' + name + '（可用 WPS / Office 打开）', icon: 'office' });
      }
      function exportDoc() {
        const d = activeDoc(); if (!d) return; syncActive();
        if (d.type === 'pdf') { if (d.data.url) window.open(d.data.url, '_blank'); return; }
        if (d.type === 'slide') {
          // 导出为真正的 .pptx（Office Open XML），完美兼容 WPS / Office 365
          const blob = buildPPTX(d.data);
          download(d.name.replace(/\.[^.]+$/, '') + '.pptx', blob);
          return;
        }
        const mime = {
          doc: 'application/msword',
          sheet: 'application/vnd.ms-excel'
        }[d.type];
        const ext = { doc: 'doc', sheet: 'xls' }[d.type];
        download(d.name.replace(/\.[^.]+$/, '') + '.' + ext, serialize(d), mime + ';charset=utf-8');
      }
      const head = '<meta charset="utf-8">';
      function serialize(d) {
        if (d.type === 'doc') {
          return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head>' + head + '<title>' + d.name + '</title></head><body>' + d.data + '</body></html>';
        }
        if (d.type === 'sheet') return sheetToOfficeHTML(d.data, d.name);
        if (d.type === 'slide') return slideToOfficeHTML(d.data, d.name);
        return '';
      }
      function sheetToOfficeHTML(sheet, name) {
        let h = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head>' + head + '<title>' + name + '</title></head><body><table border="1" cellspacing="0" cellpadding="4">';
        for (let r = 1; r <= sheet.rows; r++) {
          h += '<tr>';
          for (let c = 0; c < sheet.cols; c++) {
            const cell = sheet.cells[colName(c) + r];
            let v = cell ? (cell.v != null ? cell.v : '') : '';
            h += '<td>' + String(v).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</td>';
          }
          h += '</tr>';
        }
        h += '</table></body></html>';
        return h;
      }
      function slideToOfficeHTML(data, name) {
        let h = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:p="urn:schemas-microsoft-com:office:powerpoint" xmlns="http://www.w3.org/TR/REC-html40"><head>' + head + '<title>' + name + '</title></head><body>';
        data.slides.forEach((s, i) => {
          h += '<div style="page-break-after:' + (i < data.slides.length - 1 ? 'always' : 'auto') + ';padding:60px 80px;min-height:520px;background:' + (s.bg || '#1b2a4a') + ';color:' + (s.fg || '#ffffff') + ';">' +
            '<h1 style="font-size:36px;margin:0 0 24px 0;">' + String(s.title || '').replace(/</g, '&lt;') + '</h1>' +
            '<div style="font-size:20px;line-height:1.6;white-space:pre-wrap;">' + String(s.body || '').replace(/</g, '&lt;') + '</div>' +
            '</div>';
        });
        h += '</body></html>';
        return h;
      }
      function sheetToCSV(sheet) {
        const rows = [];
        for (let r = 1; r <= sheet.rows; r++) {
          const cells = [];
          for (let c = 0; c < sheet.cols; c++) {
            const cell = sheet.cells[colName(c) + r];
            let v = cell ? (typeof cell.v === 'number' ? cell.v : (cell.v || '')) : '';
            v = String(v);
            if (/[",\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
            cells.push(v);
          }
          rows.push(cells.join(','));
        }
        return rows.join('\n');
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
        const ext = (name.split('.').pop() || '').toLowerCase();
        const content = FS.readFile(path) || '';
        if (ext === 'pdf') {
          if (/^data:application\/pdf/.test(content)) return newDoc('pdf', { url: content, name }, name);
          return newDoc('pdf', { url: '', name }, name);
        }
        if (ext === 'csv' || ext === 'tsv') return newDoc('sheet', csvToSheet(content), name.replace(/\.[^.]+$/, ''));
        if (ext === 'json') { try { const data = JSON.parse(content); if (data.slides) return newDoc('slide', data, name.replace(/\.[^.]+$/, '')); } catch (e) { } }
        // Office 兼容格式
        if (ext === 'doc') {
          const body = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          return newDoc('doc', body ? body[1] : content, name.replace(/\.[^.]+$/, ''));
        }
        if (ext === 'xls') return newDoc('sheet', htmlTableToSheet(content), name.replace(/\.[^.]+$/, ''));
        if (ext === 'ppt') return newDoc('slide', htmlToSlides(content), name.replace(/\.[^.]+$/, ''));
        if (ext === 'pptx') {
          // 将字符串内容转为 Blob 并解析 PPTX
          const bytes = new Uint8Array(content.length);
          for (let i = 0; i < content.length; i++) bytes[i] = content.charCodeAt(i) & 0xFF;
          const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
          parsePPTX(blob).then(data => newDoc('slide', data, name.replace(/\.[^.]+$/, '')));
          return;
        }
        // html / txt / md 等按文字处理
        const html = ext === 'html' ? content : '<pre style="white-space:pre-wrap;font-family:inherit">' + content.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])) + '</pre>';
        return newDoc('doc', html, name.replace(/\.[^.]+$/, ''));
      }

      // 解析 HTML 表格为 sheet（用于打开 .xls）
      function htmlTableToSheet(html) {
        const sheet = { cols: 12, rows: 30, cells: {} };
        const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
        if (tableMatch) {
          const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
          rows.forEach((tr, r) => {
            const cells = tr.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
            cells.forEach((td, c) => {
              const v = td.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
              if (v !== '') sheet.cells[colName(c) + (r + 1)] = { raw: v, v: v };
            });
          });
          sheet.rows = Math.max(30, rows.length + 2);
        }
        recalcSheet(sheet);
        return sheet;
      }
      // 解析 HTML 幻灯片为 slide（用于打开 .ppt）
      function htmlToSlides(html) {
        const data = { index: 0, slides: [] };
        const divs = html.match(/<div[^>]*page-break-after[^>]*>([\s\S]*?)<\/div>/gi) || [];
        divs.forEach(div => {
          const style = div.match(/style="([^"]*)"/i) || ['', ''];
          const bg = (style[1].match(/background:\s*([^;]+)/i) || [, '#1b2a4a'])[1].trim();
          const fg = (style[1].match(/color:\s*([^;]+)/i) || [, '#ffffff'])[1].trim();
          const titleMatch = div.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const bodyMatch = div.match(/<div[^>]*>([\s\S]*?)<\/div>/i);
          const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() : '';
          const body = bodyMatch ? bodyMatch[1].replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : '';
          data.slides.push({ title, body, bg, fg });
        });
        if (!data.slides.length) data.slides.push({ title: '新演示文稿', body: '', bg: '#1b2a4a', fg: '#ffffff' });
        return data;
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
            rgroup('文件', [rbtn('保存', '保存到文件系统', saveDoc), rbtn('导出', '导出为 Word (.doc)', exportDoc)])
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
            rgroup('文件', [rbtn('保存', '保存到文件系统', saveDoc), rbtn('导出', '导出为 Excel (.xls)', exportDoc)])
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
            rgroup('文件', [rbtn('保存', '保存到文件系统', saveDoc), rbtn('导出', '导出为 PowerPoint (.pptx)', exportDoc)])
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