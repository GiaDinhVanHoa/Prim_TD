let nodes = [];
let edges = [];
let directed = false;
let result = null;
let toastTimer;
const $ = id => document.getElementById(id);
const graph = $('graph');

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function syncModeButtons() {
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', (b.dataset.mode === 'directed') === directed));
}

function fillSelect(select, selected) {
  const current = selected ?? select.value;
  select.innerHTML = nodes.map(node => `<option value="${node}">${node}</option>`).join('');
  if (nodes.includes(current)) select.value = current;
}

function refresh() {
  const source = $('source').value || '1';
  const target = $('target').value || nodes.at(-1);
  ['source', 'target', 'edge-from', 'edge-to'].forEach(id => fillSelect($(id), $(id).value));
  if (!nodes.includes(source)) $('source').value = nodes[0];
  if (!nodes.includes(target)) $('target').value = nodes.at(-1);
  $('graph-count').textContent = `${nodes.length} ĐỈNH · ${edges.length} CẠNH`;
  $('edge-total').textContent = `${edges.length} cạnh`;
  $('edge-list').innerHTML = edges.length ? edges.map((edge, index) => `<span class="edge-chip">${edge.from}${directed ? ' → ' : ' — '}${edge.to} · ${edge.weight}<button type="button" data-remove="${index}" aria-label="Xóa cạnh ${edge.from} ${edge.to}" title="Xóa cạnh">×</button></span>`).join('') : '<span class="panel-kicker">Chưa có cạnh. Thêm một cặp đỉnh phía trên.</span>';
  renderGraph();
}

function positions() {
  const width = graph.clientWidth || 600;
  const height = graph.clientHeight || 350;
  const cx = width / 2;
  const cy = height / 2;
  const radiusX = Math.max(80, Math.min(width * .39, 250));
  const radiusY = Math.max(75, Math.min(height * .36, 125));
  const map = {};
  nodes.forEach((node, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2 / nodes.length);
    map[node] = { x: cx + Math.cos(angle) * radiusX, y: cy + Math.sin(angle) * radiusY };
  });
  return { map, width, height };
}

function renderGraph() {
  const { map, width, height } = positions();
  graph.setAttribute('viewBox', `0 0 ${width} ${height}`);
  graph.innerHTML = '';
  if (directed) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = '<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#a7b3ab"/></marker><marker id="arrow-path" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#d66046"/></marker>';
    graph.append(defs);
  }
  const nodeRadius = 18;
  const pathEdges = new Set(result?.pathEdges ?? []);
  edges.forEach((edge, index) => {
    const a = map[edge.from];
    const b = map[edge.to];
    if (!a || !b) return;
    const onPath = pathEdges.has(index);
    let endX = b.x;
    let endY = b.y;
    if (directed) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      const gap = nodeRadius + 4;
      endX = b.x - (dx / dist) * gap;
      endY = b.y - (dy / dist) * gap;
    }
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', a.x); line.setAttribute('y1', a.y); line.setAttribute('x2', endX); line.setAttribute('y2', endY);
    line.setAttribute('class', `edge-line${onPath ? ' path' : ''}`);
    if (directed) line.setAttribute('marker-end', onPath ? 'url(#arrow-path)' : 'url(#arrow)');
    graph.append(line);
    const labelX = (a.x + b.x) / 2;
    const labelY = (a.y + b.y) / 2;
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', labelX - 14); bg.setAttribute('y', labelY - 10); bg.setAttribute('width', '28'); bg.setAttribute('height', '20'); bg.setAttribute('rx', '5'); bg.setAttribute('class', 'edge-label-bg');
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', labelX); label.setAttribute('y', labelY); label.setAttribute('class', 'edge-label'); label.textContent = edge.weight;
    graph.append(bg, label);
  });
  nodes.forEach(node => {
    const point = map[node];
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const classes = ['node'];
    if (node === $('source').value) classes.push('source');
    if (node === $('target').value) classes.push('target');
    if (result?.path.includes(node)) classes.push('path-node');
    group.setAttribute('class', classes.join(' '));
    group.addEventListener('click', () => pickNode(node));
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', point.x); circle.setAttribute('cy', point.y); circle.setAttribute('r', '18');
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', point.x); text.setAttribute('y', point.y); text.textContent = node;
    group.append(circle, text); graph.append(group);
  });
}

let pickedNode = null;
function pickNode(node) {
  if (!pickedNode) {
    pickedNode = node;
    $('edge-from').value = node;
    showToast(`Đã chọn đỉnh ${node}. Chọn đỉnh kế tiếp để tạo cạnh.`);
  } else if (pickedNode === node) {
    pickedNode = null;
    showToast('Đã bỏ chọn đỉnh.');
  } else {
    $('edge-from').value = pickedNode;
    $('edge-to').value = node;
    pickedNode = null;
    $('weight').focus();
    showToast(`Cặp ${$('edge-from').value} — ${node} đã sẵn sàng. Nhập trọng số.`);
  }
  renderGraph();
}

function clearResult() {
  result = null;
  $('result-route').textContent = 'Chưa có kết quả';
  $('result-distance').textContent = '—';
  $('result-label').textContent = 'KẾT QUẢ ĐƯỜNG ĐI NGẮN NHẤT';
  $('step-count').textContent = 'CHƯA CHẠY';
  $('step-table-wrap').innerHTML = '<div class="table-empty">Chọn điểm đầu và điểm đến, sau đó nhấn <strong>Tìm đường đi</strong>.</div>';
  renderGraph();
}

function dijkstra(source, target) {
  const distances = Object.fromEntries(nodes.map(node => [node, Infinity]));
  const previous = Object.fromEntries(nodes.map(node => [node, null]));
  const visited = new Set();
  const steps = [];
  distances[source] = 0;
  while (visited.size < nodes.length) {
    let current = null;
    for (const node of nodes) {
      if (!visited.has(node) && (current === null || distances[node] < distances[current])) current = node;
    }
    if (current === null || distances[current] === Infinity) break;
    visited.add(current);
    steps.push({ current, distances: { ...distances }, previous: { ...previous }, visited: new Set(visited) });
    edges.forEach(edge => {
      const neighbor = edge.from === current ? edge.to : (!directed && edge.to === current ? edge.from : null);
      if (neighbor === null || visited.has(neighbor)) return;
      const candidate = distances[current] + edge.weight;
      if (candidate < distances[neighbor]) { distances[neighbor] = candidate; previous[neighbor] = current; }
    });
  }
  const path = [];
  if (distances[target] !== Infinity) {
    for (let at = target; at !== null; at = previous[at]) { path.unshift(at); if (at === source) break; }
  }
  const pathEdges = [];
  for (let i = 0; i < path.length - 1; i++) {
    const edgeIndex = edges.findIndex(edge => directed ? edge.from === path[i] && edge.to === path[i + 1] : ((edge.from === path[i] && edge.to === path[i + 1]) || (edge.to === path[i] && edge.from === path[i + 1])));
    if (edgeIndex >= 0) pathEdges.push(edgeIndex);
  }
  return { steps, path, distance: distances[target], pathEdges, distanceForTable: { ...distances }, previousForTable: { ...previous } };
}

function renderSteps(data) {
  const columns = nodes.filter(node => node !== $('source').value);
  const head = `<thead><tr><th>Bước</th>${columns.map(node => `<th>đỉnh ${node}</th>`).join('')}<th>đỉnh chọn</th></tr></thead>`;
  const rows = data.steps.map((step, index) => {
    const cells = columns.map(node => {
      const distance = step.distances[node] === Infinity ? '∞' : step.distances[node];
      const parent = step.previous[node] ?? '–';
      const chosen = node === step.current;
      return `<td class="${chosen ? 'chosen' : ''}">(${distance}, ${parent})${chosen ? '<span class="star">*</span>' : ''}</td>`;
    }).join('');
    return `<tr class="${index === data.steps.length - 1 ? 'active-row' : ''}"><td>${index + 1}</td>${cells}<td class="chosen">${step.current}</td></tr>`;
  }).join('');
  const finalCells = columns.map(node => `<td>(${data.distanceForTable[node] === Infinity ? '∞' : data.distanceForTable[node]}, ${data.previousForTable[node] ?? '–'})</td>`).join('');
  $('step-table-wrap').innerHTML = `<table>${head}<tbody>${rows}<tr><td>KL</td>${finalCells}<td>—</td></tr></tbody></table>`;
  $('step-count').textContent = `${data.steps.length} LƯỢT`;
}

$('edge-form').addEventListener('submit', event => {
  event.preventDefault();
  const from = $('edge-from').value;
  const to = $('edge-to').value;
  const weight = Number($('weight').value);
  if (from === to) return showToast('Hãy chọn hai đỉnh khác nhau.');
  if (!Number.isFinite(weight) || weight < 0) return showToast('Trọng số phải là số không âm.');
  const existing = edges.findIndex(edge => directed ? edge.from === from && edge.to === to : ((edge.from === from && edge.to === to) || (edge.from === to && edge.to === from)));
  if (existing >= 0) edges[existing] = { from, to, weight };
  else edges.push({ from, to, weight });
  clearResult(); refresh();
  showToast(existing >= 0 ? 'Trọng số cạnh đã được cập nhật.' : `Đã nối ${from} ${directed ? '→' : '—'} ${to}.`);
});

$('edge-list').addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  edges.splice(Number(button.dataset.remove), 1);
  clearResult(); refresh(); showToast('Đã xóa cạnh.');
});
$('node-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = ($('node-name').value || '').trim();
  if (!name) return showToast('Hãy nhập tên đỉnh.');
  if (nodes.includes(name)) return showToast(`Đỉnh "${name}" đã tồn tại.`);
  nodes.push(name); clearResult(); refresh();
  if (nodes.length === 1) $('source').value = name;
  $('target').value = name; $('edge-to').value = name;
  $('node-name').value = ''; $('node-name').focus();
  showToast(`Đã thêm đỉnh ${name}.`);
});
$('reset-all').addEventListener('click', () => {
  nodes = []; edges = []; directed = false;
  syncModeButtons(); clearResult(); refresh(); showToast('Đã reset tất cả.');
});
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  directed = button.dataset.mode === 'directed';
  document.querySelectorAll('[data-mode]').forEach(item => item.classList.toggle('active', item === button));
  clearResult(); refresh();
}));
['source', 'target'].forEach(id => $(id).addEventListener('change', () => { clearResult(); refresh(); }));
$('run').addEventListener('click', () => {
  const source = $('source').value;
  const target = $('target').value;
  if (!source || !target) return showToast('Hãy chọn đủ đỉnh bắt đầu và kết thúc.');
  result = dijkstra(source, target);
  renderSteps(result);
  if (result.distance === Infinity) {
    $('result-route').textContent = `Không có đường đi từ ${source} đến ${target}`;
    $('result-distance').textContent = '∞';
    $('result-label').textContent = 'HAI ĐỈNH KHÔNG LIÊN THÔNG';
  } else {
    $('result-route').textContent = result.path.join('  →  ');
    $('result-distance').textContent = result.distance;
    $('result-label').textContent = `${source} ĐẾN ${target} · ĐƯỜNG ĐI NGẮN NHẤT`;
  }
  renderGraph();
});

syncModeButtons();
refresh();
