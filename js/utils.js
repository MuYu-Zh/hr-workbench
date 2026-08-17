/* ============================================================
 * utils.js — 通用工具函数（全局命名空间 HR.utils）
 * ============================================================ */
(function (global) {
  'use strict';

  var U = {};

  /** UUID v4 */
  U.uuid = function () {
    if (global.crypto && global.crypto.randomUUID) {
      return global.crypto.randomUUID();
    }
    var s = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    return s.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  /** 当前时间 ms 时间戳 */
  U.now = function () { return Date.now(); };

  /**
   * date-only 字符串 'YYYY-MM-DD'
   * 入参：Date | string | number(ms) | 空 → 今天
   */
  U.toDateStr = function (d) {
    var dt = U.toDate(d);
    if (!dt) return '';
    var y = dt.getFullYear();
    var m = String(dt.getMonth() + 1).padStart(2, '0');
    var day = String(dt.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  };

  /** 任意输入 → Date（date-only 字符串按本地时区解析，避免 UTC 偏移） */
  U.toDate = function (v) {
    if (!v && v !== 0) return null;
    if (v instanceof Date) return v;
    if (typeof v === 'number') return new Date(v);
    if (typeof v === 'string') {
      var m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})?)?/);
      if (m) {
        return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), 0, 0);
      }
      return new Date(v);
    }
    return null;
  };

  /** 格式化为 'YYYY-MM-DD HH:mm'（datetime ms） */
  U.fmtDateTime = function (ms) {
    if (!ms) return '—';
    var d = new Date(ms);
    return U.toDateStr(d) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  /** 距离今天的天数差（dateStr 相对今天，正=未来，负=过去） */
  U.daysFromToday = function (dateStr) {
    if (!dateStr) return null;
    var t = U.toDate(dateStr);
    if (!t) return null;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var target = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    return Math.round((target - today) / 86400000);
  };

  /** 今日待办日期过滤：返回今天日期字符串 */
  U.today = function () { return U.toDateStr(new Date()); };

  /** 手机号脱敏 138****1234 */
  U.maskPhone = function (p) {
    if (!p) return '—';
    return String(p).replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
  };

  /** 身份证脱敏 110***********1234 */
  U.maskIdCard = function (id) {
    if (!id) return '—';
    var s = String(id);
    if (s.length < 8) return s;
    return s.slice(0, 3) + '***********' + s.slice(-4);
  };

  /** 身份证号校验（18 位，末位可为 X） */
  U.validIdCard = function (id) {
    return /^\d{17}[\dXx]$/.test(String(id || '').trim());
  };

  /** 手机号校验（中国大陆） */
  U.validPhone = function (p) {
    return /^1\d{10}$/.test(String(p || '').trim());
  };

  /** 邮箱校验 */
  U.validEmail = function (e) {
    if (!e) return true; // 可选
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());
  };

  /** 金额格式 */
  U.fmtMoney = function (n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  /** CSV 导出（带 BOM，Excel 兼容） */
  U.exportCSV = function (filename, headers, rows) {
    var esc = function (v) {
      if (v === null || v === undefined) return '';
      var s = String(v);
      if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    var lines = [headers.map(esc).join(',')];
    rows.forEach(function (r) {
      lines.push(r.map(esc).join(','));
    });
    var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    U.downloadBlob(blob, filename);
  };

  /** Blob 下载 */
  U.downloadBlob = function (blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 300);
  };

  /** 文件大小格式化 */
  U.fmtSize = function (bytes) {
    if (!bytes && bytes !== 0) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  /** 基础 HTML 转义 */
  U.esc = function (s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /** 简单的字符串哈希（用于密码校验，非安全场景） */
  U.hash = function (str) {
    var h = 5381;
    var s = String(str || '');
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    }
    return 'h' + h.toString(16) + '_' + s.length.toString(16);
  };

  /** 生成默认业务编号：前缀 + 日期 + 序号，如 EM20250101001 */
  U.genNo = function (prefix, seq) {
    var d = U.toDateStr(new Date()).replace(/-/g, '');
    return prefix + d + String(seq).padStart(3, '0');
  };

  /** 年龄（按生日计算） */
  U.calcAge = function (birthDateStr) {
    if (!birthDateStr) return null;
    var b = U.toDate(birthDateStr);
    if (!b) return null;
    var now = new Date();
    var age = now.getFullYear() - b.getFullYear();
    var m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return age >= 0 ? age : null;
  };

  /** 月度中文名：'2025-01' → '2025年1月' */
  U.monthLabel = function (ym) {
    if (!ym) return '';
    var p = String(ym).split('-');
    return p[0] + '年' + parseInt(p[1], 10) + '月';
  };

  /** 当前月份 'YYYY-MM' */
  U.curMonth = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  };

  /** 近 N 个月数组（含当月），返回 [{ym, label}] */
  U.recentMonths = function (n) {
    var arr = [];
    var now = new Date();
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      arr.push({ ym: ym, label: U.monthLabel(ym) });
    }
    return arr;
  };

  /** 拼音首字母（简单字典，供姓名检索用；无匹配返回原字符） */
  U.pinyinInitial = function (ch) {
    var map = {
      '阿': 'A', '安': 'A', '艾': 'A',
      '巴': 'B', '白': 'B', '包': 'B', '鲍': 'B', '毕': 'B', '边': 'B', '卞': 'B', '卜': 'B', '步': 'B', '班': 'B',
      '蔡': 'C', '曹': 'C', '岑': 'C', '柴': 'C', '常': 'C', '车': 'C', '陈': 'C', '成': 'C', '程': 'C', '池': 'C', '迟': 'C', '楚': 'C', '崔': 'C', '丛': 'C',
      '戴': 'D', '邓': 'D', '丁': 'D', '董': 'D', '杜': 'D', '段': 'D', '窦': 'D', '邸': 'D',
      '范': 'F', '方': 'F', '房': 'F', '冯': 'F', '傅': 'F', '费': 'F', '樊': 'F', '符': 'F',
      '甘': 'G', '高': 'G', '葛': 'G', '耿': 'G', '龚': 'G', '顾': 'G', '关': 'G', '郭': 'G', '桂': 'G', '谷': 'G',
      '韩': 'H', '郝': 'H', '何': 'H', '贺': 'H', '洪': 'H', '侯': 'H', '胡': 'H', '黄': 'H', '华': 'H', '惠': 'H',
      '纪': 'J', '贾': 'J', '江': 'J', '姜': 'J', '蒋': 'J', '金': 'J', '靳': 'J', '季': 'J', '焦': 'J',
      '康': 'K', '孔': 'K', '柯': 'K', '寇': 'K',
      '赖': 'L', '雷': 'L', '黎': 'L', '李': 'L', '梁': 'L', '廖': 'L', '林': 'L', '刘': 'L', '龙': 'L', '卢': 'L', '陆': 'L', '罗': 'L', '吕': 'L', '鲁': 'L', '凌': 'L',
      '马': 'M', '毛': 'M', '孟': 'M', '米': 'M', '苗': 'M', '莫': 'M', '穆': 'M', '梅': 'M', '缪': 'M',
      '倪': 'N', '聂': 'N', '牛': 'N', '宁': 'N',
      '欧': 'O', '区': 'O',
      '潘': 'P', '庞': 'P', '裴': 'P', '彭': 'P', '皮': 'P', '蒲': 'P', '朴': 'P', '平': 'P',
      '齐': 'Q', '祁': 'Q', '钱': 'Q', '秦': 'Q', '邱': 'Q', '曲': 'Q', '屈': 'Q', '乔': 'Q', '戚': 'Q',
      '任': 'R', '阮': 'R', '荣': 'R', '饶': 'R',
      '沙': 'S', '邵': 'S', '佘': 'S', '沈': 'S', '盛': 'S', '施': 'S', '石': 'S', '时': 'S', '史': 'S', '司': 'S', '宋': 'S', '苏': 'S', '孙': 'S', '隋': 'S', '商': 'S',
      '谭': 'T', '汤': 'T', '唐': 'T', '陶': 'T', '田': 'T', '童': 'T', '涂': 'T', '佟': 'T',
      '万': 'W', '汪': 'W', '王': 'W', '韦': 'W', '魏': 'W', '温': 'W', '文': 'W', '翁': 'W', '吴': 'W', '伍': 'W', '武': 'W',
      '夏': 'X', '向': 'X', '萧': 'X', '肖': 'X', '谢': 'X', '辛': 'X', '邢': 'X', '熊': 'X', '徐': 'X', '许': 'X', '薛': 'X', '荀': 'X',
      '严': 'Y', '阎': 'Y', '颜': 'Y', '杨': 'Y', '姚': 'Y', '叶': 'Y', '易': 'Y', '殷': 'Y', '尹': 'Y', '于': 'Y', '余': 'Y', '俞': 'Y', '虞': 'Y', '袁': 'Y', '岳': 'Y', '云': 'Y', '尤': 'Y',
      '臧': 'Z', '曾': 'Z', '翟': 'Z', '张': 'Z', '章': 'Z', '赵': 'Z', '郑': 'Z', '钟': 'Z', '周': 'Z', '朱': 'Z', '祝': 'Z', '庄': 'Z', '卓': 'Z', '邹': 'Z', '祖': 'Z', '左': 'Z', '诸': 'Z'
    };
    return map[ch] || '';
  };

  global.HR = global.HR || {};
  global.HR.utils = U;
})(window);
