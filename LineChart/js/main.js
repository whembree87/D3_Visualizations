const margin = ({top: 20, right: 20, bottom: 30, left: 20});
const width = 1100, height = 500;

// Event listeners
$("#gender-select").on("change", updateLineChart);
$("#total-countries-select").on("change", updateLineChart);

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
});

// Take historical average and return top k
function getTopKMostAfflictedCountries(gender, k) {
    const genderData = _.filter(cleanData, (obj) => { return obj.sex_name === gender });

    const genderDataByCountry = _.groupBy(genderData, 'location_name');

    const years = _.sortBy(_.map(_.sample(genderDataByCountry), (obj) => { return obj.year }));// Ascending

    const avgDeathRateByCountry =_.map(genderDataByCountry, (objs) => ({
        'country_data': objs,
        'avg_death_rate': _.meanBy(objs, (obj) => { return obj.val; })
    }));

    const topKHighest = _.map(_.orderBy(avgDeathRateByCountry, ['avg_death_rate'], ['desc']),
        (obj) => {return obj.country_data}).slice(0, k);

    const topKHighestByCountry = _.groupBy(_.flatten(topKHighest), 'location_name');

    const countryData  = _.map(topKHighestByCountry, (objs, key) => ({
        country_name: key,
        death_rates: _.map(objs, (obj) => {  return obj.val })
    }));

    return {
        country_data: countryData,
        years: years
    }
}

function updateLineChart() {
    const gender = $("#gender-select").val();

    const k = $("#total-countries-select").val();

    const data = getTopKMostAfflictedCountries(gender, k);

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
            .text('Global opioid deaths for all ages, rate per 100k'));

    const line = d3.line()
        .defined(d => !isNaN(d))
        .x((d, i) => x(data.years[i]))
        .y(d => y(d));

    const svg = d3.select("#chart-area").append('svg')
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