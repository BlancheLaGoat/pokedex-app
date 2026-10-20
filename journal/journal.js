const list = document.getElementById('list');
for (const e of window.JOURNAL.slice().reverse()) {
  const sec = document.createElement('section');
  sec.className = 'entry';
  const head = document.createElement('header');
  const h2 = document.createElement('h2'); h2.textContent = e.version + ' — ' + e.title;
  const d = document.createElement('span'); d.className = 'muted'; d.textContent = e.date;
  head.append(h2, d); sec.append(head);
  const ul = document.createElement('ul');
  for (const p of e.points) { const li = document.createElement('li'); li.textContent = p; ul.append(li); }
  sec.append(ul);
  for (const f of e.files) {
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = f.path;
    const tag = document.createElement('span'); tag.className = 'tag ' + (f.kind === 'ajout' ? 'add' : 'mod'); tag.textContent = f.kind;
    sum.append(tag);
    const pre = document.createElement('pre');
    for (const line of f.code.split('\n')) {
      const s = document.createElement('div');
      if (f.kind !== 'ajout') {
        if (line.startsWith('+')) s.className = 'l-add';
        else if (line.startsWith('-')) s.className = 'l-del';
        else if (line.startsWith('@@')) s.className = 'l-hunk';
      }
      s.textContent = line || ' ';
      pre.append(s);
    }
    det.append(sum, pre);
    sec.append(det);
  }
  list.append(sec);
}
