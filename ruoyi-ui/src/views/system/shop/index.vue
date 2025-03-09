<template>
    <div class="app-container">
        <div id="main" style="width: 100%; height: 400px;">
        </div>
    </div>
  </template>
  
  <script>
import * as echarts from 'echarts';

export default {
    name: "shop",
    dicts: [],
    components: {  },
    data() {
      return {
        myChart: null
      };
    },
    created() {
    
    },
    mounted() {
      // 在mounted钩子中初始化图表
      this.initChart();
      // 监听窗口大小变化
      window.addEventListener('resize', this.resizeChart);
    },
    beforeDestroy() {
      // 组件销毁前移除事件监听
      window.removeEventListener('resize', this.resizeChart);
      // 销毁图表实例
      if (this.myChart) {
        this.myChart.dispose();
        this.myChart = null;
      }
    },
    methods: {
      // 图表大小自适应
      resizeChart() {
        if (this.myChart) {
          this.myChart.resize();
        }
      },
      initChart() {
        // 初始化图表
        this.myChart = echarts.init(document.getElementById('main'));
        // 设置图表配置项
        this.myChart.setOption({
          title: {
            text: 'ECharts 入门示例'
          },
          tooltip: {},
          xAxis: {
            data: ['衬衫', '羊毛衫', '雪纺衫', '裤子', '高跟鞋', '袜子']
          },
          yAxis: {},
          series: [
            {
              name: '销量',
              type: 'bar',
              data: [5, 20, 36, 10, 10, 20]
            }
          ]
        });
      },
      
    }
  };
  </script>
  