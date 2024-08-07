/*
* Data Visualization - Framework
* Copyright (C) University of Passau
*   Faculty of Computer Science and Mathematics
*   Chair of Cognitive sensor systems
* Maintenance:
*   2024, Alexander Gall <alexander.gall@uni-passau.de>
*
* All rights reserved.
*/


// Global variables
let data;
let selectedPoints = [];
const maxSelections = 5;
const colors = d3.scaleOrdinal(d3.schemeCategory10);

// size of the plots
let margin, width, height, radius;

// svg containers
let scatter, radar, dataTable;

let parsedData;

// Initially defined dimensions
let dimensions = ["SepalLengthCm", "SepalWidthCm", "PetalLengthCm", "PetalWidthCm"];

// the visual channels we can use for the scatterplot
let channels = ["scatterX", "scatterY", "size"];

function init() {
    // define size of plots
    margin = { top: 20, right: 20, bottom: 20, left: 50 };
    width = 500;
    height = 500;
    radius = width / 2;

    // Start at default tab
    document.getElementById("defaultOpen").click();

    // data table
    dataTable = d3.select('#dataTable');

    // scatterplot SVG container and axes
    scatter = d3.select("#sp").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g");

    // radar chart SVG container and axes
    radar = d3.select("#radar").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + (width / 2) + "," + (height / 2) + ")");

    // read and parse input file
    let fileInput = document.getElementById("upload"), readFile = function () {

        // clear existing visualizations
        clear();

        let reader = new FileReader();
        reader.onloadend = function () {
            parsedData = d3.csvParse(reader.result);
            initVis(parsedData);
            CreateDataTable(parsedData);
            initDashboard(parsedData);
            updateScatterplot();
            updateRadarChart();
        };
        reader.readAsText(fileInput.files[0]);
    };
    fileInput.addEventListener('change', readFile);
}

function initVis(_data) {
    // parse dimensions (i.e., attributes) from input file
    dimensions = Object.keys(_data[0]).filter(d => d !== "Id" && d !== "species");

    // y scalings for scatterplot
    let y = d3.scaleLinear()
        .domain([0, 1])
        .range([height - margin.bottom - margin.top, margin.top]);

    // x scalings for scatter plot
    let x = d3.scaleLinear()
        .domain([0, 1])
        .range([margin.left, width - margin.left - margin.right]);

    // radius scalings for radar chart
    let r = d3.scaleLinear()
        .domain([0, d3.max(_data, d => d3.max(dimensions, dim => +d[dim]))])
        .range([0, radius]);

    // scatterplot axes
    yAxis = scatter.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + margin.left + ")")
        .call(d3.axisLeft(y));

    yAxisLabel = yAxis.append("text")
        .style("text-anchor", "middle")
        .attr("y", margin.top / 2)
        .text("y");

    xAxis = scatter.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0, " + (height - margin.bottom - margin.top) + ")")
        .call(d3.axisBottom(x));

    xAxisLabel = xAxis.append("text")
        .style("text-anchor", "middle")
        .attr("x", width - margin.right)
        .text("x");

    // radar chart axes
    radarAxesAngle = Math.PI * 2 / dimensions.length;
    let axisRadius = d3.scaleLinear()
        .range([0, radius]);
    let maxAxisRadius = 0.75,
        textRadius = 0.9;

    // radar axes
    radarAxes = radar.selectAll(".axis")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("class", "axis");

    radarAxes.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", function (d, i) { return radarX(axisRadius(maxAxisRadius), i); })
        .attr("y2", function (d, i) { return radarY(axisRadius(maxAxisRadius), i); })
        .attr("class", "line")
        .style("stroke", "black");

    // render grid lines in gray
    radarAxes.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", function (d, i) { return radarX(axisRadius(maxAxisRadius), i); })
        .attr("y2", function (d, i) { return radarY(axisRadius(maxAxisRadius), i); })
        .attr("class", "line")
        .style("stroke", "gray") // Change stroke color to gray for grid lines
        .style("stroke-dasharray", "4 4");

    // render correct axes labels
    radar.selectAll(".axisLabel")
        .data(dimensions)
        .enter()
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("x", function (d, i) { return radarX(axisRadius(textRadius), i); })
        .attr("y", function (d, i) { return radarY(axisRadius(textRadius), i); })
        .text(function (d) { return d; });

    // init menu for the visual channels
    channels.forEach(function (c) {
        initMenu(c, dimensions);
    });

    // refresh all select menus
    channels.forEach(function (c) {
        refreshMenu(c);
    });

    updateScatterplot();
    updateRadarChart();
}

// clear visualizations before loading a new file
function clear() {
    scatter.selectAll("*").remove();
    radar.selectAll("*").remove();
    dataTable.selectAll("*").remove();
}

// Create Table
function CreateDataTable(_data) {
    // Clear existing content
    dataTable.selectAll("*").remove();

    var table = dataTable.append("table")
        .attr("class", "dataTableClass");

    var headers = table.append("thead").append("tr");
    var columnNames = Object.keys(_data[0]);
    headers.selectAll("th")
        .data(columnNames)
        .enter().append("th")
        .text(function (d) { return d; })
        .attr("class", "tableHeaderClass");

    var rows = table.append("tbody").selectAll("tr")
        .data(_data)
        .enter().append("tr");

    // Bind data to cells
    var cells = rows.selectAll("td")
        .data(function (row) {
            return columnNames.map(function (column) {
                return row[column];
            });
        })
        .enter().append("td")
        .text(function (d) { return d; })
        .classed("tableBodyClass", true);

    // add mouseover event
    cells.on("mouseover", function () {
        d3.select(this).style("background-color", "lightblue");
    }).on("mouseout", function () {
        d3.select(this).style("background-color", null);
    });
}

function updateScatterplot() {
    const xAttr = d3.select("#scatterX").property("value");
    const yAttr = d3.select("#scatterY").property("value");
    const sizeAttr = d3.select("#size").property("value");

    const xScale = d3.scaleLinear().domain(d3.extent(parsedData, d => +d[xAttr])).range([margin.left, width - margin.right]);
    const yScale = d3.scaleLinear().domain(d3.extent(parsedData, d => +d[yAttr])).range([height - margin.bottom, margin.top]);
    const sizeScale = d3.scaleLinear().domain(d3.extent(parsedData, d => +d[sizeAttr])).range([5, 20]);

    const svg = d3.select("#sp svg");

    svg.select(".x-axis").transition().duration(1000).call(d3.axisBottom(xScale));
    svg.select(".y-axis").transition().duration(1000).call(d3.axisLeft(yScale));

    svg.selectAll(".x-axis-label").remove(); // Remove existing label if any
    svg.append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height - 5)
        .text(xAttr);

    svg.selectAll(".y-axis-label").remove(); // Remove existing label if any
    svg.append("text")
        .attr("class", "y-axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 15)
        .text(yAttr);
        
    const points = svg.selectAll("circle").data(parsedData);

    points.enter().append("circle")
    .merge(points)
    .transition() // Add transition for animated changes
    .duration(1000) // Duration of 1 second
    .attr("cx", d => xScale(d[xAttr]))
    .attr("cy", d => yScale(d[yAttr]))
    .attr("r", d => sizeScale(d[sizeAttr]))
    .attr("fill", d => selectedPoints.includes(d) ? colors(selectedPoints.indexOf(d)) : "black")
    .style("opacity", 0.7)
    .on("end", function() { // Re-apply the click handler after the transition
        d3.select(this)
            .on("click", function(event, d) {
                if (selectedPoints.includes(d)) {
                    selectedPoints = selectedPoints.filter(p => p !== d);
                } else if (selectedPoints.length < maxSelections) {
                    selectedPoints.push(d);
                }
                updateScatterplot();
                updateRadarChart();
                updateLegend();
            });
    });

points.exit().transition().duration(1000).style("opacity", 0).remove();
}

function updateRadarChart() {
    const radius = 200;
    const angleSlice = Math.PI * 2 / dimensions.length;

    const radarLine = d3.lineRadial()
        .radius(d => d.value)
        .angle((d, i) => i * angleSlice)
        .curve(d3.curveLinearClosed);

    const maxValue = d3.max(parsedData, d => d3.max(dimensions, dim => +d[dim]));
    const radiusScale = d3.scaleLinear().range([0, radius]).domain([0, maxValue]);

    const svg = d3.select("#radar svg g");

    svg.selectAll(".radarWrapper").remove();

    // Draw gridlines
    const levels = 5; // Number of concentric circles
    const gridData = d3.range(1, levels + 1).map(level => {
        return dimensions.map((dim, i) => {
            return {
                axis: dim,
                value: radius * (level / levels)
            };
        });
    });
    const gridWrapper = svg.selectAll(".gridWrapper")
    .data(gridData)
    .enter().append("g")
    .attr("class", "gridWrapper");

gridWrapper.append("path")
    .attr("class", "gridLine")
    .attr("d", radarLine)
    .style("fill", "none")
    .style("stroke", "lightgray")

    const radarWrapper = svg.selectAll(".radarWrapper")
        .data(selectedPoints)
        .enter().append("g")
        .attr("class", "radarWrapper");

    radarWrapper.append("path")
        .attr("class", "radarArea")
        .attr("d", d => radarLine(dimensions.map((dim, i) => ({ axis: dim, value: radiusScale(+d[dim]) }))))
        .style("fill", (d, i) => colors(i))
        .style("fill-opacity", 0.3);

    radarWrapper.append("path")
        .attr("class", "radarStroke")
        .attr("d", d => radarLine(dimensions.map((dim, i) => ({ axis: dim, value: radiusScale(+d[dim]) }))))
        .style("stroke-width", "2px")
        .style("stroke", (d, i) => colors(i))
        .style("fill", "none")
        .style("stroke-opacity", 0.7);

    radarWrapper.selectAll(".radarCircle")
        .data(d => dimensions.map((dim, i) => ({ axis: dim, value: radiusScale(+d[dim]), color: colors(selectedPoints.indexOf(d)) })))
        .enter().append("circle")
        .attr("class", "radarCircle")
        .attr("r", 4)
        .attr("cx", (d, i) => radiusScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("cy", (d, i) => radiusScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2))
        .style("fill", d => d.color)
        .style("fill-opacity", 0.8);
}

function updateLegend() {
    const legend = d3.select("#legend").selectAll(".legendItem")
        .data(selectedPoints);

    legend.enter().append("div")
        .attr("class", "legendItem")
        .merge(legend)
        .style("color", (d, i) => colors(i))
        .text(d => d['species']) // Display the Species attribute
        .on("click", function(event, d) {
            selectedPoints = selectedPoints.filter(p => p !== d); // Remove selected element
            updateScatterplot();
            updateRadarChart();
            updateLegend();
        });

    legend.exit().remove();
}


function radarX(radius, index) {
    return radius * Math.cos(radarAngle(index));
}

function radarY(radius, index) {
    return radius * Math.sin(radarAngle(index));
}

function radarAngle(index) {
    return radarAxesAngle * index - Math.PI / 2;
}

// init scatterplot select menu
function initMenu(id, entries) {
    $("select#" + id).empty();

    entries.forEach(function (d) {
        $("select#" + id).append("<option>" + d + "</option>");
    });

    $("#" + id).selectmenu({
        select: function () {
            scatter.selectAll("circle").remove();
            updateScatterplot();
        }
    });
}

// refresh menu after reloading data
function refreshMenu(id) {
    $("#" + id).selectmenu("refresh");
    scatter.selectAll("circle").remove();
}

// read current scatterplot parameters
function readMenu(id) {
    return $("#" + id).val();
}

// switches and displays the tabs
function openPage(pageName, elmnt, color) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablink");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].style.backgroundColor = "";
    }
    document.getElementById(pageName).style.display = "block";
    elmnt.style.backgroundColor = color;
}

init();
