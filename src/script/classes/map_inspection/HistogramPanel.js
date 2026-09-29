import * as utils from "../../main/utils.js";

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
  dataLeft = null;
  dataRight = null;
  clampMin = 1;
  clampMax = 12;
  resizeObserver = null;
  d3 = null;
  gradientStart = utils.whiteHex;
  gradientEnd = utils.mapRedHex;

  constructor(containerElement) {
    this.container = containerElement;
    this.buildDOM();
    _loadD3UMD()
      .then(d3 => {
        this.d3 = d3;
        this.attachResizeObserver();
        if (this.dataLeft) this.draw();
      })
      .catch(e => console.error("[HistogramPanel] Failed to load d3:", e));
  }

  setData(left, right, clampStart, clampEnd) {
    this.dataLeft = left;
    this.dataRight = right;
    this.clampMin = clampStart;
    this.clampMax = clampEnd;
    if (this.d3 && this.isVisible) this.draw();
  }

  updateClamp(start, end) {
    this.clampMin = start;
    this.clampMax = end;
    if (this.dataLeft && this.d3 && this.isVisible) this.draw();
  }

  setGradient(start, end) {
    this.gradientStart = start;
    this.gradientEnd = end;
    if (this.dataLeft && this.d3 && this.isVisible) this.draw();
  }

  reset() {
    this.dataLeft = null;
    this.dataRight = null;
    this.hide();
  }

  buildDOM() {
    this.container.innerHTML =
      `
      <svg class="histogram-svg"  role="img"></svg>
    `;
  }

  show() {
    const svg = this.container.querySelector('.histogram-svg');
    if (svg) svg.style.display = 'block';
    this.isVisible = true;
    if (this.dataLeft && this.d3) this.draw();
  }

  hide() {
    const svg = this.container.querySelector('.histogram-svg');
    if (svg) svg.style.display = 'none';
    this.isVisible = false;
  }

  attachResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.dataLeft && this.d3 && this.isVisible) this.draw();
    });
    this.resizeObserver.observe(this.container);
  }

  filterFinite(data) {
    return data.filter(value => !isNaN(value) && isFinite(value));
  }

  buildBins(data) {
    const step = (this.clampMax - this.clampMin) / 10;
    const bins = Array.from({ length: 12 }, (_, i) => ({ index: i, count: 0 }));

    for (const value of data) {
      if (value < this.clampMin) {
        bins[0].count++;
      } else if (value > this.clampMax) {
        bins[11].count++;
      } else if (value === this.clampMin) {
        bins[0].count++;
      } else if (value === this.clampMax) {
        bins[11].count++;
      } else {
        const i = Math.min(9, Math.floor((value - this.clampMin) / step));
        bins[i + 1].count++;
      }
    }
    return bins;
  }

  interpolateBinColor(t) {
    const startRGB = utils.hexToRGB(this.gradientStart);
    const endRGB = utils.hexToRGB(this.gradientEnd);
    const whiteRGB = { r: 1, g: 1, b: 1 };
    const isWhite = (c) => c.r === 1 && c.g === 1 && c.b === 1;

    let resultRGB;
    if (isWhite(startRGB) || isWhite(endRGB)) {
      resultRGB = utils.lerpColor(startRGB, endRGB, t);
    } else {
      resultRGB = t < 0.5
        ? utils.lerpColor(startRGB, whiteRGB, t * 2)
        : utils.lerpColor(whiteRGB, endRGB, (t - 0.5) * 2);
    }

    const hex = utils.RGBToHex(resultRGB);
    return '#' + hex.toString(16).padStart(6, '0');
  }

  draw() {
    const d3 = this.d3;
    if (!d3 || !this.dataLeft || !this.dataRight) return;

    const svgElement = this.container.querySelector('.histogram-svg');
    if (!svgElement) return;

    const TOTAL_BINS = 12;
    const TICK_FONT = 11;

    const svgRect = svgElement.getBoundingClientRect();
    const W = Math.max(svgRect.width, 100);
    const H = Math.max(svgRect.height, 120);

    const Y_AXIS_W = 35;
    const X_AXIS_H = 24;
    const BOTTOM = 6;
    const HORIZONTAL_PADDING = 8;
    const sideW = (W - Y_AXIS_W) / 2;
    const innerH = H - X_AXIS_H - BOTTOM;

    svgElement.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const left = this.filterFinite(this.dataLeft);
    const right = this.filterFinite(this.dataRight);
    if (left.length === 0 || right.length === 0) return;

    const leftBins = this.buildBins(left);
    const rightBins = this.buildBins(right);

    const maxCount = Math.max(
      d3.max(leftBins, bin => bin.count),
      d3.max(rightBins, bin => bin.count)
    ) || 1;

    const yBand = d3.scaleBand()
      .domain(d3.range(TOTAL_BINS - 1, -1, -1))
      .range([0, innerH])
      .padding(0.08);

    const binH = yBand.bandwidth();

    const xLeft = d3.scaleLinear()
      .domain([0, maxCount])
      .range([sideW - HORIZONTAL_PADDING, HORIZONTAL_PADDING]);

    const xRight = d3.scaleLinear()
      .domain([0, maxCount])
      .range([HORIZONTAL_PADDING, sideW - HORIZONTAL_PADDING]);

    const step = (this.clampMax - this.clampMin) / 10;

    const yLabels = Array.from({ length: TOTAL_BINS }, (_, i) => {
      if (i === 0) return `≤ ${this.clampMin}`;
      if (i === TOTAL_BINS - 1) return `≥ ${this.clampMax}`;
      const maxVal = this.clampMin + i * step;
      return d3.format(".2f")(maxVal);
    });

    const binColors = Array.from({ length: TOTAL_BINS }, (_, i) => {
      const t = i / (TOTAL_BINS - 1);
      return this.interpolateBinColor(t);
    });

    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();

    svg.append('rect')
      .attr('width', W)
      .attr('height', H)
      .attr('fill', '#f3f3f3')
      .attr('stroke', '#010b13')
      .attr('stroke-width', 1);

    svg.append('g')
      .attr('transform', `translate(0,${X_AXIS_H})`)
      .selectAll('.bar')
      .data(leftBins)
      .join('rect')
      .attr('class', 'bar')
      .attr('y', d => yBand(d.index))
      .attr('height', binH)
      .attr('x', d => xLeft(d.count))
      .attr('width', d => sideW - HORIZONTAL_PADDING - xLeft(d.count))
      .attr('fill', d => binColors[d.index])
      .attr('rx', 1)
      .attr('stroke', '#666')
      .attr('stroke-width', 1);

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
      .data(rightBins)
      .join('rect')
      .attr('class', 'bar')
      .attr('y', d => yBand(d.index))
      .attr('height', binH)
      .attr('x', 0)
      .attr('width', d => xRight(d.count))
      .attr('fill', d => binColors[d.index])
      .attr('rx', 1)
      .attr('stroke', '#666').attr('stroke-width', 1);;

    svg.append('g')
      .attr('transform', `translate(${sideW + Y_AXIS_W},${X_AXIS_H})`)
      .call(d3.axisTop(xRight).ticks(3).tickFormat(d3.format('~s')).tickSize(3))
      .call(ax => ax.select('.domain').attr('stroke', '#999'))
      .call(ax => ax.selectAll('line').attr('stroke', '#999'))
      .call(ax => ax.selectAll('text').attr('fill', '#444').attr('font-size', TICK_FONT).attr('font-family', 'sans-serif'));
  }
}