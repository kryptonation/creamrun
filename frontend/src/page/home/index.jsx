import React, { useMemo } from "react";
import Img from "../../components/Img.jsx";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "highcharts";
import "./_b-home.scss";
import {
  useGetDashboardQuery,
  useGetNotificationQuery,
} from "../../redux/api/workbasketApi.js";

const Home = () => {
  // const notification = [
  //   {
  //     label: "Renewal for Medallion 1P89 completed",
  //     value: "new expiration date 12/31/2025"
  //   },
  //   {
  //     label: "Renewal for Medallion 1P89 completed",
  //     value: "new expiration date 12/31/2025"
  //   },
  //   {
  //     label: "Renewal for Medallion 1P89 completed",
  //     value: "new expiration date 12/31/2025"
  //   },

  // ];
  const { data } = useGetDashboardQuery();
  // const { data: notificationData } = useGetNotificationQuery();

  const options = useMemo(() => {
    const chartData = data?.medallion_details;
    return {
      chart: {
        type: "pie",
        height: "200px",
        margin: [0, 0, 0, 0],
        spacingTop: 0,
        spacingBottom: 0,
        spacingLeft: 0,
        spacingRight: 0,
        custom: {},
        events: {
          render() {
            this.reflow();
            const chart = this,
              series = chart.series[0];
            const totalData = series?.yData.reduce((acc, item) => {
              if (item) {
                return acc + item;
              }
              return acc;
            }, 0);
            let customLabel = chart.options.chart.custom.label;

            if (!customLabel && totalData) {
              customLabel = chart.options.chart.custom.label = chart.renderer
                .label(
                  `<strong class="text-big">${totalData}</strong><br/>` +
                    "Total"
                )
                .css({
                  color: "#000",
                  textAnchor: "middle",
                })
                .add();
            }

            const x = series.center[0] + chart.plotLeft,
              y =
                series.center[1] +
                chart.plotTop -
                customLabel?.attr("height") / 2;

            customLabel?.attr({
              x,
              y,
            });
            // Set font size based on chart diameter
            // customLabel.css({
            //   fontSize: `${series.center[2] / 12}px`
            // });
          },
        },
      },
      credits: {
        enabled: false,
      },
      accessibility: {
        point: {
          valueSuffix: "%",
        },
      },
      title: null,
      tooltip: {
        pointFormat: "{series.name}: <b>{point.percentage:.0f}%</b>",
      },
      legend: {
        enabled: false,
      },
      plotOptions: {
        series: {
          allowPointSelect: true,
          cursor: "pointer",
          borderRadius: 4,
          dataLabels: [
            {
              enabled: true,
              distance: 20,
              format:
                '<span class="text-center">{point.name}<br>{point.y}</span>',
              style: {
                align: "center",
              },
              // formatter:()=>{
              //   return `<span class="text-center">{point.name}<br>{point.y}</span>`
              // },
            },
            {
              enabled: false,
              distance: -15,
              format: "{point.percentage:.0f}%",
              style: {
                fontSize: "0.9em",
              },
            },
          ],
          showInLegend: true,
        },
      },
      series: [
        {
          name: "Percentage",
          colorByPoint: true,
          innerSize: "75%",
          data: [
            {
              name: "In Progress",
              y: chartData?.I,
              color: "var(--primarycolor)",
            },
            {
              name: "Available",
              y: chartData?.A,
              color: "var(--text-blue)",
            },
            {
              name: "Active",
              y: chartData?.Y,
              color: "var(--pinkcolor)",
            },
            {
              name: "Assigned ",
              y: chartData?.V,
              color: "var(--orangecolor)",
            },
          ],
        },
      ],
    };
  }, [data?.medallion_details]);
  const vehicleChart = useMemo(() => {
    const chartData = data?.vehicle_details;
    return {
      chart: {
        type: "pie",
        height: "200px",
        margin: [0, 0, 0, 0],
        spacingTop: 0,
        spacingBottom: 0,
        spacingLeft: 0,
        spacingRight: 0,
        events: {
          render: function () {
            this.reflow();
          },
        },
      },
      title: null,
      tooltip: {
        valueSuffix: "%",
      },
      credits: {
        enabled: false,
      },
      plotOptions: {
        series: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: [
            {
              enabled: true,
              distance: 20,
              format: "{point.name}<br>{point.y}",
              style: {
                align: "center",
              },
            },
            {
              enabled: true,
              distance: -40,
              format: "{point.percentage:.1f}%",
              style: {
                textOutline: "none",
                opacity: 0.7,
              },
            },
          ],
        },
      },
      series: [
        {
          name: "Percentage",
          colorByPoint: true,
          data: [
            {
              name: "In Progess",
              y: chartData?.["Registration In Progress"],
              color: "var(--pinkcolor)",
            },
            // {
            //   name: 'Repairs',
            //   sliced: true,
            //   selected: true,
            //   y: 20,
            //   color: "var(--orangecolor)"
            // },
            {
              name: "Available",
              y: chartData?.["Available"],
              color: "var(--primarycolor)",
            },
            {
              name: "Active",
              y: chartData?.["Active"],
              color: "var(--text-blue)",
            },
          ],
        },
      ],
    };
  }, [data?.vehicle_details]);
  const driverChart = useMemo(() => {
    const chartData = data?.driver_details;
    return {
      chart: {
        type: "column",
        height: 200,
        spacingBottom: 0,
        spacingRight: 0,
        events: {
          render: function () {
            this.reflow();
          },
        },
      },
      title: null,
      xAxis: {
        categories: ["Driver Manager", "Additional Drivers"],
      },
      yAxis: {
        min: 0,
        title: null,
        gridLineDashStyle: "longdash",
        stackLabels: {
          enabled: true,
        },
      },
      credits: {
        enabled: false,
      },
      legend: {
        align: "center",
        verticalAlign: "bottom",
        backgroundColor: "transparent",
        shadow: false,
      },
      tooltip: {
        headerFormat: "<b>{category}</b><br/>",
        pointFormat: "{series.name}: {point.y}<br/>Total: {point.stackTotal}",
      },
      plotOptions: {
        column: {
          stacking: "normal",
          dataLabels: {
            enabled: true,
          },
        },
      },
      series: [
        {
          name: "WAV",
          color: "var(--reddishorange)",
          data: [
            chartData?.driver_manager?.WAV || 0,
            chartData?.additional_driver_manager?.WAV || 0,
          ],
          // data: [14, 8]
        },
        {
          name: "Regular",
          color: "var(--bluishcyn)",
          data: [
            chartData?.driver_manager?.Regular || 0,
            chartData?.additional_driver_manager?.Regular || 0,
          ],
          // data: [3, 5]
        },
      ],
    };
  });
  // const [tripsChart, setTripChart] = useState({
  //   chart: {
  //     type: 'bar',
  //     height: "200"
  //   },
  //   title: null,
  //   xAxis: {
  //     categories: ['Aug', 'Sep', 'Oct', 'Nov'],
  //     title: {
  //       text: null
  //     },
  //     gridLineWidth: 0,
  //     lineWidth: 0
  //   },
  //   yAxis: {
  //     min: 0,
  //     title: null,
  //     labels: {
  //       overflow: 'justify'
  //     },
  //     lineWidth: 0,
  //     gridLineWidth: 1
  //   },
  //   tooltip: {
  //     valueSuffix: ' millions'
  //   },
  //   plotOptions: {
  //     series: {
  //       pointWidth: 15
  //     },
  //     bar: {
  //       dataLabels: {
  //         enabled: true
  //       },
  //       groupPadding: 0.1
  //     }
  //   },
  //   legend: {
  //     enabled: false,
  //   },
  //   credits: {
  //     enabled: false
  //   },
  //   series: [{
  //     name: 'Year 1990',
  //     data: [632, 727, 3202, 721]
  //   }]
  // });

  return (
    <div className="common-layout w-100 h-100 d-flex flex-column gap-4 home-screen">
      <div className="d-flex align-items-center">
        <div className=" w-33">
          <div className="d-flex align-items-center gap-2 ">
            <Img name="medallion" className="icon-black" />
            <p className="topic-txt"> Medallions</p>
          </div>
          {/* <div className='d-flex align-items-center'> */}
          <div className="chart-con">
            <HighchartsReact
              highcharts={Highcharts}
              options={options}
              containerProps={{
                style: {
                  height: "100%",
                  width: "100%",
                  paddingInline: "0",
                  display: "flex",
                  alignItems: "center",
                },
              }}
            />
          </div>
          {/* <div className='d-flex medallion-reading flex-wrap'>
              {
                medallionData.map((item, idx) => {
                  return (
                    <div key={idx} className='w-50 p-2 d-flex align-items-center justify-content-center flex-column'>
                      {item.value ? <p className="topic-txt">{item.value}</p> : null}
                      <p className="fw-small text-nowrap">{item.label}</p>
                    </div>
                  )
                })
              }
            </div> */}
          {/* </div> */}
        </div>
        <div className="w-33">
          <div className="d-flex align-items-center gap-2 ">
            <Img name="car" className="icon-black" />
            <p className="topic-txt"> Vehicles</p>
          </div>
          <div className="vehicle-chart">
            <HighchartsReact
              highcharts={Highcharts}
              options={vehicleChart}
              containerProps={{
                style: {
                  height: "100%",
                  width: "100%",
                  paddingInline: "0",
                },
              }}
            />
          </div>
        </div>
        <div className=" w-33">
          <div className="d-flex align-items-center gap-2 ">
            <Img name="driver" className="icon-black" />
            <p className="topic-txt"> Driver Type</p>
          </div>
          <div className="bar-chart-con">
            <HighchartsReact
              highcharts={Highcharts}
              options={driverChart}
              containerProps={{
                style: {
                  height: "100%",
                  width: "100%",
                  paddingInline: "0",
                },
              }}
            />
          </div>
        </div>
      </div>
      <div className="d-flex justify-content-between w-100 gap-4">
        {/* <div className='w-60'>
          <p className='topic-txt'>Ongoing Trips</p>
          <div className='trip-chart'>
            <HighchartsReact
              highcharts={Highcharts}
              options={tripsChart}
              containerProps={{
                style: {
                  height: "100%",
                  width: "100%",
                  paddingInline: "0",
                },
              }}
            />
          </div>
        </div> */}
        <div className="w-50 notify-con">
          <p className="topic-txt pb-2">Notifications</p>
          <p className="regular-text text-grey">No data found</p>
          {/* {notificationData?.length?<div className='d-flex flex-column gap-3'>
            {
              notificationData?.map((item, idx) => {
                return (
                  <div key={idx} data-testid={`notification-${idx}`} className='d-flex align-items-center gap-2'>
                    <div className='rounded-circle p-2 px-3 bell-icon '>
                      <Img />
                    </div>
                    <div>
                      <p className='regular-text'>{item.title}</p>
                      <p className='fw-small text-grey'>{item.message}{item.created_on}</p>
                    </div>
                  </div>
                )
              })
            }
          </div>:<p className='regular-text text-grey'>No data found</p>} */}
        </div>
      </div>
    </div>
  );
};

export default Home;
