/*
*    main.js
*    Mastering Data Visualizations with D3.js
*    Project 2 - Gapminder Clone
*/
var margin = { left:80, right:20, top:50, bottom:100 };

var width = 600 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

var flag = true;
var time = 0;

var t = d3.transition().duration(750);

var g = d3.select("#chart-area")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

var xAxisGroup = g.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height +")");

var yAxisGroup = g.append("g")
    .attr("class", "y axis");

// X Scale
var x = d3.scaleLog()
    .base(10)
    .range([0, width])
    .domain([300, 150000]);

// Y Scale
// [0, 90]
var y = d3.scaleLinear()
    .range([height, 0])
    .domain([0, 90]);

// X Label
var xLabel = g.append("text")
    .attr("y", height + 50)
    .attr("x", width / 2)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("GDP per Capita($)");

// Y Label
var yLabel = g.append("text")
    .attr("y", -60)
    .attr("x", -(height / 2))
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Life Expectancy (Years)");

// X Axis
var xAxisCall = d3.axisBottom(x)
    .tickValues([400, 4000, 40000])
    .tickFormat(d3.format("$"));

g.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height +")")
    .call(xAxisCall);

// Y Axis
var yAxisCall = d3.axisLeft(y)
    .tickFormat(function(d){ return +d; });

g.append("g")
    .attr("class", "y axis")
    .call(yAxisCall);

d3.json("data/data.json").then(function(data){

	// Clean data
    const formattedData = data.map(function(year){
        return year["countries"].filter(function(country){
            var dataExists = (country.income && country.life_exp);
            return dataExists
        }).map(function(country){
            country.income = +country.income;
            country.life_exp = +country.life_exp;
            return country;
        })
    });

    d3.interval(function(){
        time = (time < 214) ? time + 1 : 0;
        update(formattedData[time]);
    }, 100);// ms

    update(formattedData[0]);
});

function update(data) {
    // Standard transition time for the visualization
    var t = d3.transition()
        .duration(100);

    // JOIN new data with old elements.
    var countries = g.selectAll("circle")
        .data(data, function(d){
            return d.country;
        });

    // EXIT old elements not present in new data.
    countries.exit().remove();

    // ENTER new elements present in new data...
    countries.enter()
        .append("circle")
        .attr("fill", "green")
        .merge(countries)
        .transition(t)
            .attr("cx", function(d){ return x(d.income) })
            .attr("cy", function(d){ return y(d.life_exp); })
            .attr("r", 5 );
}