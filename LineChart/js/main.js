const margin = ({top: 20, right: 20, bottom: 30, left: 40});

const width = 1000, height = 600;

d3.csv("data/IHME_opioid_data.csv").then((rawData) => {
    // Time parser for x-axis
    const parseTime = d3.timeParse("%Y");

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
        d.year = parseTime(d.year);
    });

    const unisexData = _.filter(rawData, (o) => { return o.sex_name === 'Both' });

    const opioidDataByCountry = _.groupBy(unisexData, 'location_name');

    const years = _.sortBy(_.map(_.sample(opioidDataByCountry), (o) => { return o.year }));

    const avgDeathRateByCountry =_.map(opioidDataByCountry, (objects, key) => ({
        'country_data': objects,
        'avg_death_rate': _.meanBy(objects, (o) => { return +o.val; })
    }));

    const top10HighestDeathRatesByCountry = _.map(_.orderBy(avgDeathRateByCountry, ['avg_death_rate'], ['desc']),
        (o) => {return o.country_data}).slice(0, 10);

    const top10ByCountry = _.groupBy(_.flatten(top10HighestDeathRatesByCountry), 'location_name');

    const series = _.map(top10ByCountry, (objs, key) => ({
        'name': key,
        'values': _.map(objs, (o) => {  return o.val })
    }));

    const data = {y: 'Death Rates per 100k', series: series, years: years };

    // -----------------------------------------------------------------------------------------------------------------

    const x = d3.scaleTime()
        .domain(d3.extent(data.years))
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data.series, d => d3.max(d.values))]).nice()
        .range([height - margin.bottom, margin.top]);

    const line = d3.line()
        .defined(d => !isNaN(d))
        .x((d, i) => x(data.years[i]))
        .y(d => y(d));

    const xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

    const yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .call(g => g.select(".domain").remove())
        .call(g => g.select(".tick:last-of-type text").clone()
            .attr("x", 3)
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text(data.y));

    const svg = d3.select("#chart-area").append('svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    svg.append("g")
        .call(xAxis);

    svg.append("g")
        .call(yAxis);

    const path = svg.append("g")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
        .selectAll("path")
        .data(data.series)
            .enter().append("path")
                .style("mix-blend-mode", "multiply")
                .attr("d", d => line(d.values));

    svg.call(hover, path);

    function hover(svg, path) {
        svg.style("position", "relative");

        if ("ontouchstart" in document) svg
            .style("-webkit-tap-highlight-color", "transparent")
            .on("touchmove", moved)
            .on("touchstart", entered)
            .on("touchend", left);
        else svg
            .on("mousemove", moved)
            .on("mouseenter", entered)
            .on("mouseleave", left);

        const dot = svg.append("g")
            .attr("display", "none");

        dot.append("circle")
            .attr("r", 2.5);

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
            const s = data.series.reduce((a, b) => Math.abs(a.values[i] - ym) < Math.abs(b.values[i] - ym) ? a : b);
            path.attr("stroke", d => d === s ? null : "#ddd").filter(d => d === s).raise();
            dot.attr("transform", `translate(${x(data.years[i])},${y(s.values[i])})`);
            dot.select("text").text(s.name);
        }

        function entered() {
            path.style("mix-blend-mode", null).attr("stroke", "#ddd");
            dot.attr("display", null);
        }

        function left() {
            path.style("mix-blend-mode", "multiply").attr("stroke", null);
            dot.attr("display", "none");
        }
    }
});