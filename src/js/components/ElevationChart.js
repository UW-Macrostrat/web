import React, { Component } from 'react'
import Drawer from 'material-ui/Drawer'
import IconButton from 'material-ui/IconButton'
import CloseIcon from 'material-ui-icons/Close'
import Grid from 'material-ui/Grid'

import { select, mouse } from 'd3-selection'
import { scaleLinear } from 'd3-scale'
import { axisBottom, axisLeft } from 'd3-axis'
import { line, area } from 'd3-shape'
import { min, max, extent, bisector } from 'd3-array'

class ElevationChart extends Component {
  constructor(props) {
    super(props)
    this.chart = null
    this.close = () => {
      select('#elevationChart').select('g').remove()
      delete this.chart
      this.props.toggleElevationChart()
    }
  }

  render() {
    let ctx = select('#elevationChart')

    if (ctx && this.props.elevationData.length && !this.chart) {
      this.drawChart()
    }

    return (
      <Drawer
        anchor={"bottom"}
        open={this.props.elevationChartOpen}
        onBackdropClick={this.props.toggleElevationChart}
        transitionDuration={300}
        hideBackdrop={true}
        disableAutoFocus={true}
        ModalProps={{
          classes: {
            'root': 'elevationChart-root'
          }
        }}
      >
      <div className='elevationChart-content'>
        <Grid container alignItems="center" alignContent="center" justify="center" classes={{ 'spacing-xs-16': 'infodrawer-grid' }}>
          <Grid item xs={12} classes={{ 'grid-xs-12': 'infodrawer-header-grid elevationGridItem'}}>
            <div className="infodrawer-header">
              <div className="infodrawer-header-item">
                <IconButton color="default" aria-label="ElevationChart" onClick={this.close}>
                  <CloseIcon/>
                </IconButton>
              </div>
            </div>
          </Grid>

          <Grid item xs={12} classes={{ 'grid-xs-12': 'elevationGridItem' }}>
            <div>
              { this.props.elevationData && this.props.elevationData.length === 0  ?
                <div className="elevationInstructions">
                  Click two points on the map to draw an elevation profile
                </div>
                : ''
              }

              <div className={this.props.elevationData && this.props.elevationData.length === 0  ? 'hidden': 'elevationChartWrapper'}>
                <svg id="elevationChart"></svg>
              </div>
            </div>
          </Grid>
        </Grid>
      </div>
    </Drawer>
    )
  }


  drawChart() {
    // Alias these variables because d3 returns `this` in mouseover
    let data = this.props.elevationData
  //  let shareState = this.props.shareState

    let margin = {top: 20, right: 50, bottom: 30, left: 70}
    let width = window.innerWidth - margin.left - margin.right
    let height = 150 - margin.top - margin.bottom

    let bisect = bisector((d) => { return d.d }).left

    let x = scaleLinear()
        .range([0, width])

    let y = scaleLinear()
        .range([height, 0])

    let xAxis = axisBottom()
        .scale(x)

    let yAxis = axisLeft()
        .scale(y)
        .ticks(5)
        .tickSizeInner(-width)
        .tickSizeOuter(0)
        .tickPadding(10)

    let elevationLine = line()
      //  .interpolate('basis')
        .x(d => { return x(d.d) })
        .y(d => { return y(d.elevation) })

    let elevationArea = area()
        // .interpolate('basis')
        .x(d => { return x(d.d) })
        .y1(d => { return y(d.elevation) })

    this.chart = select('#elevationChart')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
      .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)

    let minElevation = min(this.props.elevationData, d => { return d.elevation })
    let maxElevation = max(this.props.elevationData, d => { return d.elevation })

    let minElevationBuffered = minElevation - ((maxElevation - minElevation) * 0.2)
    let maxElevationBuffered = maxElevation + ((maxElevation - minElevation) * 0.1)

    this.exageration = (max(this.props.elevationData, d => { return d.d }) / width) / (((maxElevationBuffered - minElevationBuffered) * 0.001) / height)


    x.domain(extent(this.props.elevationData, d => { return d.d }))
    y.domain([minElevationBuffered, maxElevationBuffered])

    elevationArea.y0(y(minElevationBuffered))

    this.chart.append('g')
        .attr('class', 'x axis')
        .attr('transform', `translate(0, ${height})`)
        .call(xAxis)
      .append('text')
        .attr('transform', `translate(${width/2}, 30)`)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Distance (km)')

    this.chart.append('g')
        .attr('class', 'y axis')
        .call(yAxis)
      .append('text')
        .attr('transform', `translate(-50,${height/2})rotate(-90)`)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Elevation (m)')

    this.chart.append('path')
        .datum(this.props.elevationData)
        .attr('class', 'line')
        .attr('fill', 'rgba(75,192,192,1)')
        .attr('stroke', 'rgba(75,192,192,1)')
        .attr('d', elevationLine)

    this.chart.append('path')
        .datum(this.props.elevationData)
        .attr('fill', 'rgba(75,192,192,0.4)')
        .attr('d', elevationArea)

    let focus = this.chart.append('g')
        .attr('class', 'focus')
        .style('display', 'none')

    focus.append('circle')
      .attr('fill', 'rgba(75,192,192,1)')
      .attr('fill-opacity', 1)
      .attr('stroke', 'rgba(220,220,220,1)')
      .attr('stroke-width', 2)
      .attr('r', 7)

    focus.append('text')
      .attr('x', 0)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#333333')
      .attr('dy', '-1.2em')

    const updateElevationMarker = this.props.updateElevationMarker
    this.chart.append('rect')
        .attr('class', 'overlay')
        .attr('width', width)
        .attr('height', height)
        .on('mouseover', () => { focus.style('display', null) })
        .on('mouseout', () => { focus.style('display', 'none') })
        .on('mousemove', function(e) {
          let x0 = x.invert(mouse(this)[0])
          let i = bisect(data, x0, 1)
          let d0 = data[i - 1]
          let d1 = data[i]
          let d = x0 - d0.d > d1.d - x0 ? d1 : d0;
          focus.attr('transform', `translate(${x(d.d)},${y(d.elevation)})`);
          focus.select('text')
            .text(`${d.elevation} m / ${(parseInt(d.elevation) * 3.28084).toFixed(0)} ft`)

          updateElevationMarker(d.lng, d.lat)
        })
  }
}


export default ElevationChart
