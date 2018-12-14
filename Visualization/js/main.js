/*
Inspiration : https://beta.observablehq.com/@mbostock/d3-multi-line-chart#chart,
              https://beta.observablehq.com/@mbostock/d3-donut-chart
*/

// Event listeners
$("#gender-select").on("change", updateLineChart, updateDonutChart);
$("#total-countries-select").on("change", updateLineChart, updateDonutChart);

d3.csv("data/IHME_opioid_data.csv").then((rawData) => {
    const parseYear = d3.timeParse("%Y");

    // Clean data
    rawData.forEach((d) => {
        d.age_id = +d.age_id;
        d.cause_id = +d.cause_id;
        d.location_id = +d.location_id;
        d.lower = +d.lower;
        d.measure_id = +d.measure_id;
        d.sex_id = +d.sex_id;
        d.upper = +d.upper;
        d.val = +d.val;
        d.year = parseYear(d.year);
    });

    cleanData = rawData;

    // Call for first time
    updateLineChart();
    updateDonutChart();
});

function updateLineChart() {
    const margin = ({top: 20, right: 20, bottom: 30, left: 20});
    const width = 1000, height = 400;

    const gender = $("#gender-select").val();

    const k = $("#total-countries-select").val();

    const data = getTopKMostAfflictedCountries(gender, k)['line_chart_data'];

    d3.select("svg").remove();

    const x = d3.scaleTime()
        .domain(d3.extent(data.years))
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data.country_data, d => d3.max(d.death_rates))]).nice()
        .range([height - margin.bottom, margin.top]);

    const xAxis = (g) => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

    const yAxis = (g) => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .call(g => g.select(".domain"))
        .call(g => g.select(".tick:last-of-type text").clone()
            .attr("x", 3)
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text('Deaths, rate per 100k'));

    const line = d3.line()
        .defined(d => !isNaN(d))
        .x((d, i) => x(data.years[i]))
        .y(d => y(d));

    const svg = d3.select("#line-chart").append('svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    svg.append("g")
        .call(xAxis);

    svg.append("g")
        .call(yAxis);

    const lineColors = d3.scaleOrdinal(d3.schemePaired);

    const path = svg.append("g")
        .selectAll("path")
        .data(data.country_data)
        .enter().append("path")
        .style("mix-blend-mode", "multiply")
        .attr("d", d => line(d.death_rates))
        .attr("fill", "none")
        .attr("stroke", d => lineColors(d.country_name))
        .attr("stroke-width", 1.5)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round");

    svg.call(hover, path);

    function hover(svg, path) {
        svg.style("position", "relative");

        if ("ontouchstart" in document)
            svg
                .style("-webkit-tap-highlight-color", "transparent")
                .on("touchmove", moved)
                .on("touchstart", entered)
                .on("touchend", left);
        else
            svg
                .on("mousemove", moved)
                .on("mouseenter", entered)
                .on("mouseleave", left);

        const dot = svg.append("g")
            .attr("display", "none");

        dot.append("circle")
            .attr("r", 3.0);

        dot.append("text")
            .style("font", "10px sans-serif")
            .attr("text-anchor", "middle")
            .attr("y", -8);

        function moved() {
            d3.event.preventDefault();
            const ym = y.invert(d3.event.layerY);
            const xm = x.invert(d3.event.layerX);
            const i1 = d3.bisectLeft(data.years, xm, 1);
            const i0 = i1 - 1;
            const i = xm - data.years[i0] > data.years[i1] - xm ? i1 : i0;
            const s = data.country_data.reduce((a, b) => Math.abs(a.death_rates[i] - ym) <
            Math.abs(b.death_rates[i] - ym) ? a : b);
            path.attr("stroke", d => lineColors(d.country_name));

            dot.attr("transform", `translate(${x(data.years[i])},${y(s.death_rates[i])})`);
            dot.select("text").text(s.country_name + " " + s.death_rates[i].toFixed(2).toString());
        }

        function entered() {
            path.style("mix-blend-mode", null).attr("stroke", "#ddd");
            dot.attr("display", null);
        }

        function left() {
            path.style("mix-blend-mode", "multiply").attr("stroke", d => lineColors(d.country_name));
            dot.attr("display", "none");
        }
    }
}

function updateDonutChart() {
    const gender = $("#gender-select").val();

    const k = $("#total-countries-select").val();

    const data = getTopKMostAfflictedCountries(gender, k)['donut_chart_data']['topKCountriesAvgData'];

    d3.select("svg").remove();

    updateLineChart();

    const width = 600, height = 350;

    const radius = Math.min(width, height) / 2;

    const arc = d3.arc().innerRadius(radius * 0.67).outerRadius(radius - 1);

    const pie = d3.pie()
        .padAngle(0.07)
        .sort(null)
        .value(d => d.value);

    const arcs = pie(data);

    const color = d3.scaleOrdinal()
        .domain(data.map(d => d.name))
        .range(d3.quantize(t => d3.interpolateSpectral(t * 0.8 + 0.1), data.length).reverse());

    const svg = d3.select("#donut-chart")
        .append("svg")
        .attr('width', width)
        .attr('height', height)
        .attr("text-anchor", "middle")
        .style("font", "12px sans-serif");

    const g = svg.append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    g.selectAll("path")
        .data(arcs)
        .enter().append("path")
        .attr("fill", d => color(d.data.name))
        .attr("d", arc)
        .append("title")
        .text(d => `${d.data.name}: ${d.data.value.toLocaleString()}`);

    const text = g.selectAll("text")
        .data(arcs)
        .enter().append("text")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("dy", "0.35em");

    text.append("tspan")
        .attr("x", 0)
        .attr("y", "-0.7em")
        .style("font-weight", "bold")
        .text(d => d.data.name);

    text.filter(d => (d.endAngle - d.startAngle) > 0.25).append("tspan")
        .attr("x", 0)
        .attr("y", "0.7em")
        .attr("fill-opacity", 0.7)
        .text(d => d.data.value.toLocaleString());
}

function getTopKMostAfflictedCountries(gender, k) {
    const genderData = _.filter(cleanData, (obj) => { return obj.sex_name === gender });

    const genderDataByCountry = _.groupBy(genderData, 'location_name');

    // Take historical average and return top k
    const avgDeathRateByCountry = _.map(genderDataByCountry, (objs, key) => ({
        country_name: key,
        country_data: objs,
        avg_death_rate: _.meanBy(objs, (obj) => { return obj.val; })
    }));

    const topKHighest = _.map(_.orderBy(avgDeathRateByCountry, ['avg_death_rate'], ['desc']),
        (obj) => {return obj.country_data}).slice(0, k);

    const topKHighestByCountry = _.groupBy(_.flatten(topKHighest), 'location_name');

    // Line chart
    const years = _.sortBy(_.map(_.sample(genderDataByCountry), (obj) => { return obj.year }));// Ascending

    const topKCountriesData  = _.map(topKHighestByCountry, (objs, key) => ({
        country_name: key,
        death_rates: _.map(objs, (obj) => {  return obj.val })
    }));

    // Donut chart
    const allCountriesAvgData = _.map(avgDeathRateByCountry, (obj) => ({
        name: obj.country_name,
        value: obj.avg_death_rate }));

    const topKCountriesAvgData = _.orderBy(allCountriesAvgData, ['value'], ['desc']).slice(0, k);

    return {
        line_chart_data : {
            country_data: topKCountriesData,
            years: years
        },
        donut_chart_data: {
            topKCountriesAvgData
        }
    }
}