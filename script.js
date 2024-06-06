
const csv_form_obj = document.getElementById("csvForm")
csv_form_obj.addEventListener("submit", handleEvent);

function new_feature(){
    return "new feature"
}
function foo(){
    return 100
}

function updateStatusBar(status_bar_id, status_message){
    const status_bar_div = document.getElementById(status_bar_id);
    status_bar_div.innerHTML = status_message;
}
function handleEvent(event){
    event.preventDefault();
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    console.log("handleEvent called");
    console.log("filename: ", file.name);
    

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const csvData = e.target.result;  // csvData: string
          // console.log(csvData);
          const jsonString = JSON.stringify(csvData);
          // console.log(jsonString);
          // Process the CSV data and generate images
          // Example: Call your script to process the CSV data and generate images
          // displayImages(images); // Assume displayImages is a function to display the generated images
          // Call the function to invoke the Cloud Function
        //   var args = {json_data: jsonString, file_name: file.name};
        //   console.log("args: \n");
        //   console.log(args);
          console.log("uploaded-filename: " + file.name)
          updateStatusBar(status_bar_id="status-bar", status_message="Processing your file...")
          uploadCSVtoCloudStorage(csvData, file.name);
          // getImage();
        }
        reader.readAsText(file);
    }
}
function uploadCSVtoCloudStorage(csvData, uploaded_filename) {
    const url = 'https://us-central1-race-analytics-pygsheet.cloudfunctions.net/uploadFunction'; // Replace with the URL of your Cloud Function

    console.log("dtype of csvData: ", typeof(csvData));  // string
    console.log("csvData:\n" + csvData);
    console.log("JSON string:\n" + JSON.stringify({csvData}));
    console.log("type of JSON string:\n" + typeof(JSON.stringify({csvData})));  // string

    // Make an HTTP POST request to the Python Cloud Function with the CSV string
    // body: a Bodyinit object or null to set the request object
    // Cross-origin resource sharing (CORS)
    var len = uploaded_filename.length;
    var passed_text_data = len + " " + uploaded_filename + csvData;
    console.log("passed text data: " + passed_text_data);

    fetch(url, {
    method: 'POST',
    mode: "cors",
    body: passed_text_data,
    headers: {
        // note that only one content type can be specified
        'Content-Type': 'application/json',
    },
    
    })
    .then(response => {
    // response.json();  // parse the returned json string and return a promise obj
    //                   // the promise obj is automatically assigned to "data"
        updateStatusBar(status_bar_id="status-bar", status_message="Completed.")
        return response.json();
    })
    .then(data => {
        var records = data[0].data.data;
        var win_rates = data[1];
        console.log(records);
        console.log(records[0]["NAME"]);
        console.log(win_rates);
        var name_labels = [];
        var time_data = [];
        var win_rates_list = [];
        const lane_labels = ["LANE1", "LANE2", "LANE3", "LANE4", "LANE"];

        for (let index in records){
            let current_record =  records[index];
            let name = current_record["NAME"];
            let time = current_record["TIME"];
            name_labels.push(name);
            time_data.push(time);
        }

        for (let lane_no in win_rates){
            win_rates_list.push(win_rates[lane_no]);
        }

        win_rates_list = win_rates_list[0];  // turn it to a single arr
        win_rates_data = [];
        for (let lane_no in win_rates_list){
            win_rates_data.push(win_rates_list[lane_no]);
        }
        console.log("name labels:", name_labels);
        console.log("time_data:", time_data);
        console.log("lane win rates:", win_rates_data);
        
        showTotalNumRecords(records.length);
        createTable(jsonData=records);
        createBarChart(labels_input=name_labels, data_input=time_data);
        createWinRatesBarChart_ChartJS(labels_input=lane_labels, data_input=win_rates_data);
        createBoxPlot(data_input=time_data);
    })
    .catch(error => {
    console.error('Error sending CSV string:', error);
    });
}

function createBarChart(labels_input, data_input){
  const ctx = document.getElementById('horizontal-bar-chart').getContext('2d');
  const chart = new Chart(ctx, {
      type: 'bar',
      data: {
          labels: labels_input,  // Replace with your labels
          datasets: [{
              label: 'Finished time (s)',
              data: data_input,  // Replace with your data values
              backgroundColor: 'rgba(54, 162, 235, 0.2)',  // Set the background color
              borderColor: 'rgba(54, 162, 235, 1)',  // Set the border color
              borderWidth: 1  // Set the border width
          }]
      },
      options: {
          indexAxis: 'y',  // Set the index axis to 'y' for horizontal bars
          responsive: true,
          plugins: {
              legend: {
                  position: 'top'  // Set the position of the legend
              },
              title: {
                  display: true,
                  text: 'Time Ranking',  // Set the title of the chart
                  color: "white"
              }

          }
      }
  });
}

function createBoxPlot(data_input){
    var data = [{
          x: data_input,
          type: 'box',
          orientation: 'h' // Specify horizontal orientation
        }
    ];

    // Layout configuration for the horizontal box plot
    var layout = {
        plot_bgcolor: "#151519",
        paper_bgcolor:"#151519",
        xaxis: {
            color: "white",
            gridcolor: "white"
        },
        yaxis: {
            color: "white"
        },
        title:{
          text: "Time Distribution",
          font:{
              color: "#FFFFF"
          }
        }
    };

    // Create the horizontal box plot using Plotly.js
    Plotly.newPlot("box-plot-chart", data, layout);
}

function createTable(jsonData){
    // Extract headers and cells from JSON data
    // var headers = Object.keys(jsonData[0]);
    // jsonData: 2d array, (outer array: array of single records, inner array: array of key-value pairs)
    // 0: {DIFF: 0, FORMATTED-TIME: '"00:05.100"', LANE: 2, NAME: 'Ken', TIME: 5.1003890038, …}
    // 1: {DIFF: 1.1172488928, FORMATTED-TIME: '"00:06.217"', LANE: 1, NAME: 'Bee', TIME: 6.2176378965, …}
    // 2: {DIFF: 3.5568330288, FORMATTED-TIME: '"00:08.657"', LANE: 3, NAME: 'Mike', TIME: 8.6572220325, …}
    // 3: {DIFF: 4.3163499832, FORMATTED-TIME: '"00:09.416"', LANE: 3, NAME: 'Ben'
    // jsonData is already sorted by time in ascending order (fastest to slowest)

    // var headers = ["RACER", "LANE", "TIME", "DIFF"];
    var headers = ["RANK", "RACER", "LANE", "TIME", "TOP DIFF"];
    // var cells = headers.map(function(key) {return jsonData.map(function(row) {return row[key];});
    // });
    // console.log(cells);  // cell data, 2d array, array of [array of values (not obj)]

    cells = [];
    for (let i = 0; i < jsonData.length; i++){
        let row = [];
        let rank = i + 1;
        let racer_name = jsonData[i]["NAME"];
        let lane = jsonData[i]["LANE"];
        let time_s = format_time(jsonData[i]["TIME"]);
        let top_diff_s = "+" + format_time(jsonData[i]["DIFF"]);

        row.push(rank);
        row.push(racer_name);
        row.push(lane);
        row.push(time_s);
        row.push(top_diff_s);
        cells.push(row);
    }
    console.log("cells:\n", cells);

    // Create the table using Plotly.js
    var table = {
        type: 'table',
        header: {
            values: headers,
            align: 'center',
            line: {width: 1, color: 'darkgrey'},
            fill: {color: '#151519'},
            font: {
                color: "lightgrey"
            }
        },
        cells: {
            values: transposeArray(cells),
            align: 'center',
            line: {color: "darkgrey", width: 1},
            fill: {color: ['#151519']},
            font: {
                color: "lightgrey"
            },
            height: "40"
        }
    };

    var data = [table];

    var layout = {
        plot_bgcolor: "#151519",
        paper_bgcolor:"#151519",
        title: {
            text: "Time Ranking",
            font:{
                color: "white"
            }
        }
    };

    Plotly.newPlot('time-ranking-table', data, layout);
}

function createWinRatesBarChart(data_input){
    var data = [{
      x: ["LANE 1", "LANE 2", "LANE 3", "LANE 4", "LANE 5"],
      y: data_input,
      type: 'bar'
    }];
    // Define the layout for the bar chart
    var layout = {
      plot_bgcolor: "#151519",
      paper_bgcolor:"#151519",
      title: {
          text: "Lane Win Rates",
          font:{
              color: "white"
          }
      },
      xaxis: {
          color: "white"
      },
      yaxis: {
          color: "white"
      }
    };
    // Create the bar chart using Plotly.js
    Plotly.newPlot('win-rates-chart', data, layout);
}

function createWinRatesBarChart_ChartJS(labels_input, data_input){
    const ctx = document.getElementById('win-rates-chart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels_input,  // Replace with your labels
            datasets: [{
                label: 'Win Rates (%)',
                data: data_input,  // Replace with your data values
                backgroundColor: 'rgba(54, 162, 235, 0.2)',  // Set the background color
                borderColor: 'rgba(54, 162, 235, 1)',  // Set the border color
                borderWidth: 1  // Set the border width
            }]
        },
        options: {
            indexAxis: 'x',  // Set the index axis to 'y' for horizontal bars
            responsive: true,
            plugins: {
                legend: {
                    position: 'top'  // Set the position of the legend
                },
                title: {
                    display: true,
                    text: 'Lane Win Rates',  // Set the title of the chart
                    color: "white"
                }
  
            }
        }
    });
  }

function format_time(seconds) {
    // Convert seconds to minutes and remaining seconds
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
  
    // Extract the integer part and the milliseconds part
    const integerSeconds = Math.floor(remainingSeconds);
    const milliseconds = Math.round((remainingSeconds - integerSeconds) * 1000);
  
    // Format the time components to ensure they have two digits
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(integerSeconds).padStart(2, '0');
    const formattedMilliseconds = String(milliseconds).padStart(3, '0');
  
    // Return the formatted time string in mm:ss.SSS format
    return `${formattedMinutes}:${formattedSeconds}.${formattedMilliseconds}`;
  }

function transposeArray(array) {
    return array[0].map((_, colIndex) => array.map(row => row[colIndex]));
}

// Function to generate a unique ID for a new document
function generateDocumentID() {
    // Get the current timestamp
    const timestamp = new Date().getTime();
  
    // Generate a random number between 0 and 9999
    const randomNum = Math.floor(Math.random() * 10000);
  
    // Concatenate the timestamp and random number to create the ID
    const documentID = `DOC_${timestamp}_${randomNum}`;
  
    return documentID;
}

function showTotalNumRecords(n){
    // n: number, total number of records
    const total_num_records_div = document.getElementById("total-num-records");
    total_num_records_div.innerHTML = "Total number of records: " + n;
}