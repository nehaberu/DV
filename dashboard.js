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

// TODO: File for Part 2
// TODO: You can edit this file as you wish - add new methods, variables etc. or change/delete existing ones.

// TODO: use descriptive names for variables

// Global variables for charts
let chart1, chart2, chart3, chart4;

function initDashboard(_data) {

    createChart1(_data); // Pass the data to create chart1
    createChart2(_data); // Pass the data to create chart2
    createChart3(_data); // Pass the data to create chart3
    createChart4(_data); // Pass the data to create chart4
}


// Pie chart update - The donut chart needs to update smoothly when you click on different years in the radio buttons. 
//Each year shows production values for different flow, represented as segments in the chart.

function createChart1(_data) {
    // Define dimensions
    const width = 600;
    const height = Math.min(500, width / 2);
    const outerRadius = height / 2 - 10;
    const innerRadius = outerRadius * 0.75;
    const color = d3.scaleOrdinal().range(d3.schemeBlues[4]); // Color scale

    // Create SVG container
    const svg = d3.select("#chart1")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height]); // Set viewBox for responsiveness

    // Define arc generator
    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    // Define pie generator
    const pie = d3.pie()
        .sort(null) // Disable sorting of pie slices
        .value(d => d[1]); // Value accessor function for the pie layout

    // Group the data by year
    const dataByYear = d3.group(_data, d => d.year);

    // Function to update the donut chart based on selected year and country
    function updateDonutChart(year, country_name) {
        // Clear existing SVG content
        svg.selectAll("*").remove();
        let rollupdata
        let data;
        if (country_name) {
            // Filter data by both year and country name
            data = _data.filter(d => d.country_name === country_name && d.year === year);
            rollupdata = d3.rollup(data, v => d3.sum(v, d => d.value), d => d.flow)

        } else {
            // Filter data by year only
            data = dataByYear.get(String(year));
            rollupdata = d3.rollup(data, v => v.length, d => d.flow);
        }

        if (!data) {
            console.error(`No data found for the year ${year}`);
            return;
        }
       
        // Generate arcs based on updated data
        const arcs = pie(Array.from(rollupdata));

        // Render paths for donut slices with transitions
        const path = svg.append("g")
            .selectAll()
            .data(arcs)
            .join("path")
            .attr("fill", d => color(d.data[0]))
            .attr("d", arc)
            .each(function(d) { this._current = d; });

        path.transition().duration(750).attrTween("d", 
            function (d) {
                const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
                return function (t) {
                    return arc(i(t));
                };
            }
        );

        // Add legend for the updated donut chart
        const legend = svg.append("g")
            .attr("transform", `translate(${width / 2 - 100}, ${height / 2 - 100})`)
            .selectAll("legend")
            .data(arcs)
            .join("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => `translate(0, ${i * 20})`);

        legend.append("rect")
            .attr("x", -18)
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", d => color(d.data[0]));

        legend.append("text")
            .attr("x", 0)
            .attr("y", 9)
            .attr("dy", "0.35em")
            .text(d => d.data[0])
            .style("font-size", "9.5px");
    }

    // Create radio buttons for each year
    const years = Array.from(dataByYear.keys()).sort();

    const radioButtons = d3.select("#chart1-radios")
        .selectAll("label")
        .data(years)
        .enter().append("label");

    // Add radio inputs
    radioButtons.append("input")
        .attr("type", "radio")
        .attr("name", "year")
        .attr("value", d => d)
        .property("checked", d => d === years[0]);

    // Add labels for radio buttons
    radioButtons.append("span")
        .text(d => d);

    // Handle change event for radio buttons
    radioButtons.on("change", function(event) {
        const selectedYear = event.target.value;
        updateDonutChart(selectedYear); // Update pie chart on year change
    });

    // Initialize with the first year's data
    updateDonutChart(years[0]);

    // Make the updateDonutChart function globally accessible
    window.updateDonutChart = updateDonutChart;
}











// Zoomable Bar chart - This chart zooms the bars of all the countries based on the production value

function createChart2(_data) {
    // Define dimensions and margins
    const margin = { top: 20, right: 20, bottom: 100, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3.select("#chart2")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Scales and axes
    const x = d3.scaleBand()
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .range([height, 0]);

    const xAxis = d3.axisBottom(x).tickSizeOuter(0);
    const yAxis = d3.axisLeft(y);

    // Process data - include all countries
    const data = _data.filter(d => d.value !== null); // Filter out countries with null values

    x.domain(data.map(d => d.country_name));
    y.domain([0, d3.max(data, d => d.value)]);

    // Render bars
    svg.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.country_name))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.value))
        .style("fill", "steelblue") 
        .on("click", function (event, d) {
            // When a bar is clicked, update the Donut Chart and highlight corresponding country in chart3
            const selectedYear = d3.select('input[name="year"]:checked').node().value;
            window.updateDonutChart(selectedYear, d.country_name);
            highlightCountry(d.country_name);
        })
        .call(d3.drag()
            .on("start", dragStart)
            .on("drag", dragged)
            .on("end", dragEnd));

    // Add x-axis
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis)
        .selectAll("text")
        .attr("transform", function () {
            return "rotate(-45)"; // Rotate x-axis labels for better readability
        })
        .style("text-anchor", "end")
        .style("font-size", "10px")
        .attr("dx", "-.8em")
        .attr("dy", ".15em");

    // Add x-axis label
    svg.append("text")
        .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 40})`) // Moved down
        .style("text-anchor", "middle")
        .text("Country");

    // Add y-axis
    svg.append("g")
        .attr("class", "y-axis")
        .call(yAxis);

    // Add y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Value");

    // Zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([1, 8]) // Limit zoom scale from 1x to 8x
        .translateExtent([[0, 0], [width, height]])
        .extent([[0, 0], [width, height]])
        .on("zoom", zoomed);

    svg.call(zoom);

    // Zoom event handler
    function zoomed(event) {
        const transform = event.transform;
        const xz = x.range([0, width].map(d => transform.applyX(d)));

        // Update bar positions and widths on zoom
        svg.selectAll(".bar")
            .attr("x", d => xz(d.country_name))
            .attr("width", xz.bandwidth());

        // Update x-axis with zoomed scale
        svg.select(".x-axis").call(xAxis.scale(xz));

        // Rotate x-axis labels if zoomed
        svg.selectAll(".x-axis text")
            .attr("transform", function () {
                return "rotate(-45)";
            })
            .style("text-anchor", "end")
            .style("font-size", "10px")
            .attr("dx", "-.8em")
            .attr("dy", ".15em");
    }

    // Drag event handlers
    function dragStart(event, d) {
        d3.select(this).raise().classed("active", true);
    }

    function dragged(event, d) {
        const xPos = event.x;
        const currentIndex = x.domain().indexOf(d.country_name);
        const newIndex = Math.max(0, Math.min(x.domain().length - 1, Math.round(xPos / x.step())));

        if (currentIndex !== newIndex) {
            const currentDomain = x.domain();
            currentDomain.splice(currentIndex, 1);
            currentDomain.splice(newIndex, 0, d.country_name);
            x.domain(currentDomain);

            svg.selectAll(".bar")
                .attr("x", d => x(d.country_name));

            svg.select(".x-axis").call(xAxis.scale(x));

            svg.selectAll(".x-axis text")
                .attr("transform", function () {
                    return "rotate(-45)";
                })
                .style("text-anchor", "end")
                .style("font-size", "10px")
                .attr("dx", "-.8em")
                .attr("dy", ".15em");
        }
    }

    function dragEnd(event, d) {
        d3.select(this).classed("active", false);
    }

    // Function to highlight country in chart3
    function highlightCountry(country_name) {
        d3.select("#chart3").selectAll("path")
            .style("fill", function (d) {
                return d.properties.name === country_name ? d3.color(d3.select(this).attr("fill")).darker() : d3.select(this).attr("fill");
            });
    }
}










//Choropleth Map - Visualise production values across different countries over time.

function createChart3(_data) {
    // Define dimensions and margins
    const margin = { top: 20, right: 20, bottom: 70, left: 10 };
    const width = 800 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // Fit the projection using d3.geoEqualEarth
    const projection = d3.geoEqualEarth()
        .fitSize([width, height], { type: "Sphere" });

    // Create a path generator
    const path = d3.geoPath().projection(projection);

    // Create SVG container
    const svg = d3.select("#chart3")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Add a white sphere with a black border
    svg.append("path")
        .datum({ type: "Sphere" })
        .attr("class", "globe")
        .attr("fill", "black")
        .attr("stroke", "#000")
        .attr("stroke-width", 0.5)
        .attr("d", path);

    // Load and display the World map using TopoJSON
    d3.json("countries-50m.json").then(function (world) {
        // Convert TopoJSON to GeoJSON
        const countries = topojson.feature(world, world.objects.countries);
        const countrymesh = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);

        // Calculate total production values by country and product type
        const productionByCountry = d3.rollup(_data, v => {
            const total = d3.sum(v, d => d.value);
            const products = d3.rollup(v, g => d3.sum(g, d => d.value), d => d.product);
            const productValues = Array.from(products, ([productType, value]) => ({ productType, value }));
            const sortedProducts = productValues.sort((a, b) => b.value - a.value).slice(0, 3); // Top 3 products by value
            const productPercentages = sortedProducts.map(product => ({
                productType: product.productType,
                percentage: (product.value / total) * 100
            }));
            return { total, products: productPercentages };
        }, d => d.country_name);

        // Define color scales
        const steelBlueColor = "steelblue";
        const darkBlueColor = d3.color("steelblue").darker(1); // Darker shade of steel blue
        const noDataColor = "#f0f0f0";

        // Add paths for each country and color them based on production value
        svg.selectAll("path")
            .data(countries.features)
            .join("path")
            .attr("fill", d => {
                const productionData = productionByCountry.get(d.properties.name);
                return productionData ? steelBlueColor : noDataColor;
            })
            .attr("d", path)
            .style("cursor", "pointer")
            .on("mouseover", function (event, d) {
                // Mouseover event handler: Shows tooltip with production data
                const productionData = productionByCountry.get(d.properties.name);
                const totalProduction = productionData ? productionData.total.toFixed(2) : "No data";
                const products = productionData ? productionData.products : [];

                let tooltipText = `<strong>${d.properties.name}</strong><br>`;
                tooltipText += `<strong>Total Production:</strong> ${totalProduction}<br>`;

                if (products.length > 0) {
                    tooltipText += "<strong>Top 3 Products:</strong><br>";
                    products.forEach(product => {
                        tooltipText += `${product.productType}: ${product.percentage.toFixed(2)}%<br>`;
                    });
                }

                tooltip.style("visibility", "visible").html(tooltipText);
            })
            .on("mousemove", function (event) {
                tooltip.style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function (event, d) {
                tooltip.style("visibility", "hidden");
            });

        // Add a black mesh
        svg.append("path")
            .datum(countrymesh)
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("d", path);

        // Tooltip element
        const tooltip = d3.select("#chart3")
            .append("div")
            .style("position", "absolute")
            .style("z-index", "10")
            .style("background-color", "white")
            .style("padding", "5px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "10px")
            .style("visibility", "hidden");

        // Zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([1, 8]) // Limit zoom scale from 1x to 8x
            .translateExtent([[0, 0], [width, height]])
            .extent([[0, 0], [width, height]])
            .on("zoom", zoomed);

        svg.call(zoom);

        // Zoom event handler
        function zoomed(event) {
            const { transform } = event;
            svg.selectAll("path")
                .attr("transform", transform);
        }

        // Function to highlight country in chart3
        window.highlightCountryInChart3 = function (country_name) {
            svg.selectAll("path")
                .attr("fill", d => {
                    const productionData = productionByCountry.get(d.properties.name);
                    return productionData && d.properties.name === country_name ? darkBlueColor : (productionData ? steelBlueColor : noDataColor);
                });
        };

    }).catch(function (error) {
        console.error('Error loading the JSON file:', error);
    });
}







//Line chart, multiple series - Oil Production Trends by Product (2021-2023)

function createChart4(data) {
    // Define dimensions and margins
    const margin = { top: 20, right: 20, bottom: 50, left: 70 };
    const width = 800 - margin.left - margin.right; // Increase width for better spacing
    const height = 500 - margin.top - margin.bottom;

    // Parse the data and aggregate values by product and year
    const products = d3.rollup(
        data,
        (v) => d3.sum(v, (d) => d.value),
        (d) => d.product,
        (d) => d.year
    );

    // Convert products map to array of objects for easier processing
    const productsArray = Array.from(products, ([product, values]) => ({
        product: product,
        values: Array.from(values, ([year, value]) => ({ year: year, value: value })),
    }));

    // Create scales
    const x = d3
        .scaleBand()
        .domain(productsArray[0].values.map((d) => String(d.year)))
        .range([0, width])
        .padding(0.2); // Increase padding between bars for better spacing

    const y = d3
        .scaleLinear()
        .domain([0, d3.max(productsArray.flatMap((d) => d.values), (d) => d.value)])
        .nice()
        .range([height, 0]);

    const color = d3
        .scaleOrdinal()
        .domain(productsArray.map((d) => d.product))
        .range(d3.schemeCategory10); // Distinguishable color scheme

    // Create SVG container
    const svg = d3
        .select("#chart4")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add x-axis
    svg
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSizeOuter(0));

    // Add y-axis
    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y).tickFormat(d3.format(".2s")));

    // Line generator
    const line = d3
        .line()
        .x((d) => x(String(d.year)) + x.bandwidth() / 2)
        .y((d) => y(d.value));

    // Draw lines with initial transition
    let currentIndex = 0;

    function drawNextLine() {
        const currentProduct = productsArray[currentIndex];
        svg.append("path")
            .datum(currentProduct.values)
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", color(currentProduct.product))
            .attr("stroke-width", 4)
            .attr("d", line)
            .attr("stroke-dasharray", function () {
                return this.getTotalLength() + " " + this.getTotalLength();
            })
            .attr("stroke-dashoffset", function () {
                return this.getTotalLength();
            })
            .transition()
            .duration(1000)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);

        currentIndex = (currentIndex + 1) % productsArray.length;
    }

    // Start drawing lines in a loop
    const interval = d3.interval(drawNextLine, 1500);

    // Add legend
    const legend = svg
        .selectAll(".legend")
        .data(productsArray.map((d) => d.product))
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(${width - 20},${i * 20})`);

    legend
        .append("rect")
        .attr("x", 0)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", (d) => color(d));

    legend
        .append("text")
        .attr("x", -6)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text((d) => d);

    // Add x-axis label
    svg.append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "end")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .text("Year");

    // Add y-axis label
    svg.append("text")
        .attr("class", "y-axis-label")
        .attr("text-anchor", "end")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 50)
        .attr("dy", "-1.5em")
        .attr("transform", "rotate(-90)")
        .text("Value");

    return svg.node();
}


function clearDashboard() {
    chart1.selectAll("*").remove();
    chart2.selectAll("*").remove();
    chart3.selectAll("*").remove();
    chart4.selectAll("*").remove();
}

initDashboard(parsedData);



