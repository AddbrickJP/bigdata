// npm install puppeteer-extra puppeteer-extra-plugin-stealth
// npm install fast-csv
// npm install https-proxy-agent

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');
const { format } = require('@fast-csv/format');

// 随机延时函数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomSleep = async () => {
    const time = Math.floor(Math.random() * (15000 - 8000) + 8000); // 8-15秒随机延时
    await sleep(time);
};

// 随机User Agent列表
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
];

(async () => {
    const browser = await puppeteer.launch({ 
        headless: false, // 改为有头模式，方便调试
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--window-position=0,0',
            '--ignore-certifcate-errors',
            '--ignore-certifcate-errors-spki-list',
            // '--proxy-server=http://your-proxy-ip:port', // 如果有代理服务器，可以在这里启用
            `--user-agent=${userAgents[Math.floor(Math.random() * userAgents.length)]}`,
            '--disable-blink-features=AutomationControlled'
        ],
        defaultViewport: null
    });

    const page = await browser.newPage();
    
    // 修改 webdriver 标记
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
        
        // 添加语言
        Object.defineProperty(navigator, 'languages', {
            get: () => ['zh-CN', 'zh', 'en'],
        });
    });

    // 设置页面属性
    await page.setViewport({ width: 1920, height: 1080 });
    
    // 设置请求拦截
    await page.setRequestInterception(true);
    
    // 拦截请求
    page.on('request', (req) => {
        if(req.resourceType() === 'image' || req.resourceType() === 'stylesheet' || req.resourceType() === 'font'){
            req.abort();
        } else {
            req.continue();
        }
    });

    let totalProducts = 0;
    let pageNum = 1;
    let allData = [];
    let retryCount = 0;
    const maxRetries = 3;

    while (totalProducts < 10000 && retryCount < maxRetries) {
        try {
            console.log(`正在爬取第 ${pageNum} 页数据...`);
            
            // 访问页面前随机延时
            await randomSleep();
            
            // 访问页面
            const response = await page.goto(`https://www.amazon.com/s?k=laptop&page=${pageNum}`, { 
                waitUntil: 'networkidle2',
                timeout: 60000 
            });

            // 检查是否被重定向到验证页面
            const currentUrl = page.url();
            console.log('当前页面URL:', currentUrl);
            
            if (currentUrl.includes('robot') || currentUrl.includes('captcha')) {
                console.log('检测到验证页面，等待人工处理...');
                await sleep(30000); // 等待30秒，给用户时间手动处理验证
                continue;
            }

            // 保存页面内容以供调试
            const html = await page.content();
            fs.writeFileSync(`debug_page_${pageNum}.html`, html);
            
            // 随机滚动行为
            await page.evaluate(async () => {
                const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
                const randomScrolls = Math.floor(Math.random() * 3) + 2; // 2-4次随机滚动
                
                for(let i = 0; i < randomScrolls; i++) {
                    window.scrollTo({
                        top: Math.random() * document.body.scrollHeight,
                        behavior: 'smooth'
                    });
                    await delay(1000);
                }
            });
            
            await randomSleep();

            // 等待商品列表加载
            try {
                await page.waitForSelector('.s-result-item', { timeout: 60000 });
            } catch (error) {
                console.log('未找到商品列表，尝试其他选择器...');
                // 尝试其他可能的选择器
                await page.waitForSelector('.s-search-result', { timeout: 60000 });
            }

            // 获取商品信息
            let products = await page.evaluate(() => {
                let items = [];
                // 尝试多个可能的选择器
                const selectors = [
                    '.s-result-item h2 .a-link-normal',
                    '.s-search-result h2 .a-link-normal',
                    '.s-result-item .a-text-normal'
                ];
                
                for (let selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        elements.forEach(item => {
                            if (item.textContent.trim()) {
                                items.push(item.textContent.trim());
                            }
                        });
                        break;
                    }
                }
                return items;
            });

            console.log(`找到 ${products.length} 个商品`);

            if (products.length > 0) {
                allData = allData.concat(products);
                totalProducts += products.length;
                console.log(`已爬取 ${totalProducts} 行数据`);
                
                // 每爬取一页就保存一次
                const tempCsvStream = format({ headers: true });
                const tempWritableStream = fs.createWriteStream(`amazon_data_page${pageNum}.csv`);
                tempCsvStream.pipe(tempWritableStream);
                products.forEach(row => tempCsvStream.write({ title: row }));
                tempCsvStream.end();
                
                retryCount = 0; // 重置重试计数
                pageNum++;
            } else {
                console.log('当前页面未找到商品，可能被反爬限制，等待较长时间...');
                retryCount++;
                await sleep(60000); // 增加等待时间到60秒
                continue;
            }
            
        } catch (error) {
            console.error(`爬取过程中出错: ${error.message}`);
            retryCount++;
            await sleep(60000); // 增加等待时间到60秒
            if (retryCount >= maxRetries) {
                console.log('达到最大重试次数，程序退出');
                break;
            }
            continue;
        }
    }

    console.log("数据爬取完成，总数：" + allData.length);

    // 保存到最终的 CSV
    const csvStream = format({ headers: true });
    const writableStream = fs.createWriteStream("amazon_data_final.csv");

    csvStream.pipe(writableStream);
    allData.forEach(row => csvStream.write({ title: row }));
    csvStream.end();

    // 关闭浏览器
    await browser.close();
})().catch(error => {
    console.error('程序执行出错:', error);
});
