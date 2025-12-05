
(function () {
  const container = document.querySelector('.levels-section');
  if (!container) return;

  const NAV_TEMPLATE = 'cell.html?coord={coord}';

  function buildNavUrl(coord) {
    return NAV_TEMPLATE.replace('{coord}', encodeURIComponent(coord));
  }

  container.innerHTML = '';

  const size = 8;
  let selectedCell = null;

  function selectCell(cell) {
    if (!cell) return;
    if (selectedCell === cell) {
      cell.classList.remove('selected');
      cell.setAttribute('aria-pressed', 'false');
      selectedCell = null;
      container.dispatchEvent(new CustomEvent('cellselect', { detail: { coord: cell.dataset.coord, selected: false } }));
      return;
    }
    if (selectedCell) {
      selectedCell.classList.remove('selected');
      selectedCell.setAttribute('aria-pressed', 'false');
    }
    cell.classList.add('selected');
    cell.setAttribute('aria-pressed', 'true');
    selectedCell = cell;
    container.dispatchEvent(new CustomEvent('cellselect', { detail: { coord: cell.dataset.coord, selected: true } }));

    const coord = cell.dataset.coord;
    const url = buildNavUrl(coord);
    window.location.href = url;
  }

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if ((row + col) % 2 === 0) {
        cell.classList.add('dark');
      } else {
        cell.classList.add('light');
      }

      const file = String.fromCharCode('a'.charCodeAt(0) + col);
      const rank = size - row;
      cell.dataset.coord = `${file}${rank}`;
      cell.setAttribute('aria-label', `${file}${rank}`);
      cell.tabIndex = 0;
      cell.setAttribute('role', 'button');
      cell.setAttribute('aria-pressed', 'false');

      const index = row * size + col + 1;
      const label = document.createElement('span');
      label.className = 'cell-label';
      label.textContent = String(index);
      cell.appendChild(label);

      cell.addEventListener('click', () => selectCell(cell));
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectCell(cell);
        }
      });

      container.appendChild(cell);
    }
  }
})();
