function _loadD3UMD() {
  return new Promise((resolve, reject) => {
    if (window.d3) { resolve(window.d3); return; }
    const s = document.createElement("script");
    s.src = "./src/libs/three/d3.v7.js";
    s.onload = () => window.d3 ? resolve(window.d3) : reject(new Error("window.d3 undefined after load"));
    s.onerror = () => reject(new Error("Failed to load d3.v7.js"));
    document.head.appendChild(s);
  });
}

export class HistogramPanel {
  isVisible = false;
  container = null;
  dataForward = null;
  dataReverse = null;
  clampMin = 1;
  clampMax = 12;
  resizeObserver = null;
  d3 = null;

  constructor(containerElement) {
    this.container = containerElement;
    this.buildDOM();
    _loadD3UMD()
      .then(d3 => {
        this.d3 = d3;
        this.attachResizeObserver();
        if (this.dataForward) this.draw();
      })
      .catch(e => console.error("[HistogramPanel] Failed to load d3:", e));
  }

  setData(forward, reverse, clampStart, clampEnd) {
    this.dataForward = forward;
    this.dataReverse = reverse;
    this.clampMin = clampStart;
    this.clampMax = clampEnd;
    if (this.d3 && this.isVisible) this.draw();
  }

  updateClamp(start, end) {
    this.clampMin = start;
    this.clampMax = end;
    if (this.dataForward && this.d3 && this.isVisible) this.draw();
  }

  reset() {
    this.dataForward = null;
    this.dataReverse = null;
    this.hide();
  }

  destroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
  }

  buildDOM() {
    this.container.innerHTML = `
      <div class="hist-panel" style="display:none; width:100%; height:100%;">
        <svg class="hist-svg" style="width:100%; height:100%; display:block;" role="img"></svg>
      </div>
    `;
  }

  show() {
    const p = this.container.querySelector('.hist-panel');
    if (p) p.style.display = 'block';
    this.isVisible = true;
    if (this.dataForward && this.d3) this.draw();
  }

  hide() {
    const p = this.container.querySelector('.hist-panel');
    if (p) p.style.display = 'none';
    this.isVisible = false;
  }

  attachResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.dataForward && this.d3 && this.isVisible) this.draw();
    });
    this.resizeObserver.observe(this.container);
  }

  filterFinite(data) {
    return data.filter(v => !isNaN(v) && isFinite(v));
  }

  buildBins(data) {
    const step = (this.clampMax - this.clampMin) / 10;
    const bins = Array.from({ length: 12 }, (_, i) => ({ index: i, count: 0 }));

    for (const v of data) {
      if (v < this.clampMin) {
        bins[0].count++;
      } else if (v > this.clampMax) {
        bins[11].count++;
      } else if (v === this.clampMin) {
        bins[0].count++;
      } else if (v === this.clampMax) {
        bins[11].count++;
      } else {
        const i = Math.min(9, Math.floor((v - this.clampMin) / step));
        bins[i + 1].count++;
      }
    }
    return bins;
  }

  draw() {
    const d3 = this.d3;
    if (!d3 || !this.dataForward || !this.dataReverse) return;

    const svgEl = this.container.querySelector('.hist-svg');
    if (!svgEl) return;

    const TOTAL_BINS = 12;
    const TICK_FONT  = 11;
    const BAR_COLOR  = '#ff0000';

    const W = Math.max(this.container.clientWidth, 100);
    const H = Math.max(this.container.clientHeight, 120);

    const Y_AXIS_W = 35;
    const X_AXIS_H = 24;
    const BOTTOM   = 6;
    const sideW    = (W - Y_AXIS_W) / 2;
    const innerH   = H - X_AXIS_H - BOTTOM;

    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svgEl.setAttribute('width', W);
    svgEl.setAttribute('height', H);

    const fwd = this.filterFinite(this.dataForward);
    const rev = this.filterFinite(this.dataReverse);
    if (fwd.length === 0 || rev.length === 0) return;

    const fwdBins = this.buildBins(fwd);
    const revBins = this.buildBins(rev);

    const maxCount = Math.max(
      d3.max(fwdBins, b => b.count),
      d3.max(revBins, b => b.count)
    ) || 1;

    const yBand = d3.scaleBand()
      .domain(d3.range(TOTAL_BINS - 1, -1, -1))
      .range([0, innerH])
      .padding(0.08);

    const binH = yBand.bandwidth();

    const xLeft = d3.scaleLinear()
      .domain([0, maxCount])
      .range([sideW, 0]);

    const xRight = d3.scaleLinear()
      .domain([0, maxCount])
      .range([0, sideW]);

    const step = (this.clampMax - this.clampMin) / 10;

    const yLabels = Array.from({ length: TOTAL_BINS }, (_, i) => {
      if (i === 0) return `≤ ${this.clampMin}`;
      if (i === TOTAL_BINS - 1) return `≥ ${this.clampMax}`;
      const maxVal = this.clampMin + i * step;
      return d3.format(".2f")(maxVal);
    });

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    svg.append('g')
      .attr('transform', `translate(0,${X_AXIS_H})`)
      .selectAll('.bar')
      .data(fwdBins)
      .join('rect')
      .attr('class', 'bar')
      .attr('y', d => yBand(d.index))
      .attr('height', binH)
      .attr('x', d => xLeft(d.count))
      .attr('width', d => sideW - xLeft(d.count))
      .attr('fill', BAR_COLOR)
      .attr('rx', 1);

    svg.append('g')
      .attr('transform', `translate(0,${X_AXIS_H})`)
      .call(d3.axisTop(xLeft).ticks(3).tickFormat(d3.format('~s')).tickSize(3))
      .call(ax => ax.select('.domain').attr('stroke', '#999'))
      .call(ax => ax.selectAll('line').attr('stroke', '#999'))
      .call(ax => ax.selectAll('text').attr('fill', '#444').attr('font-size', TICK_FONT).attr('font-family', 'sans-serif'));

    const gY = svg.append('g')
      .attr('transform', `translate(${sideW},${X_AXIS_H})`);

    gY.append('line')
      .attr('x1', 0).attr('x2', 0)
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', '#666').attr('stroke-width', 1);

    gY.selectAll('text')
      .data(yLabels)
      .join('text')
      .attr('x', Y_AXIS_W / 2)
      .attr('y', (_, i) => yBand(i) + binH / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', '#222')
      .attr('font-size', TICK_FONT)
      .attr('font-family', 'sans-serif')
      .attr('font-weight', '500')
      .text(d => d);

    svg.append('g')
      .attr('transform', `translate(${sideW + Y_AXIS_W},${X_AXIS_H})`)
      .selectAll('.bar')
      .data(revBins)
      .join('rect')
      .attr('class', 'bar')
      .attr('y', d => yBand(d.index))
      .attr('height', binH)
      .attr('x', 0)
      .attr('width', d => xRight(d.count))
      .attr('fill', BAR_COLOR)
      .attr('rx', 1);

    svg.append('g')
      .attr('transform', `translate(${sideW + Y_AXIS_W},${X_AXIS_H})`)
      .call(d3.axisTop(xRight).ticks(3).tickFormat(d3.format('~s')).tickSize(3))
      .call(ax => ax.select('.domain').attr('stroke', '#999'))
      .call(ax => ax.selectAll('line').attr('stroke', '#999'))
      .call(ax => ax.selectAll('text').attr('fill', '#444').attr('font-size', TICK_FONT).attr('font-family', 'sans-serif'));
  }
}