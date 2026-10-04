import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Set guest cookie
  await context.addCookies([{
    name: 'LearnUp_guest_mode',
    value: 'true',
    domain: 'localhost',
    path: '/',
  }]);

  await page.goto('http://localhost:3000/dashboard');
  await page.waitForSelector('header');
  await page.waitForTimeout(2000);

  const getMeasurements = async () => {
    return await page.evaluate(() => {
      const html = document.documentElement;
      const htmlStyle = getComputedStyle(html);
      
      const header = document.querySelector('header');
      const headerStyle = getComputedStyle(header);
      
      const mainWrapper = header.parentElement; 
      const mainStyle = getComputedStyle(mainWrapper);

      return {
        dataTheme: html.getAttribute('data-theme'),
        sfColorBg: htmlStyle.getPropertyValue('--sf-color-bg').trim(),
        sfColorSurface: htmlStyle.getPropertyValue('--sf-color-surface').trim(),
        sfColorTextPrimary: htmlStyle.getPropertyValue('--sf-color-text-primary').trim(),
        sfColorPrimary: htmlStyle.getPropertyValue('--sf-color-primary').trim(),
        headerBg: headerStyle.backgroundColor,
        headerColor: headerStyle.color,
        headerBorder: headerStyle.borderBottomColor,
        mainBg: mainStyle.backgroundColor,
      };
    });
  };

  const beforeClick = await getMeasurements();

  let toggleBtn = await page.$('button[aria-label="Switch to Dark Theme"]');
  if (!toggleBtn) toggleBtn = await page.$('button[aria-label="Switch to Light Theme"]');
  if (toggleBtn) await toggleBtn.click();
  await page.waitForTimeout(500);
  const afterClick = await getMeasurements();

  if (toggleBtn) await toggleBtn.click();
  await page.waitForTimeout(500);
  const afterSecondClick = await getMeasurements();

  const elementAtHeader = await page.evaluate(() => {
    const header = document.querySelector('header');
    const hRect = header.getBoundingClientRect();
    // try to get the background of the header itself, avoiding children if possible
    const el = document.elementFromPoint(hRect.left + 5, hRect.top + 5); 
    if (!el) return 'none';
    const computed = getComputedStyle(el);
    return `tagName: ${el.tagName}, className: ${el.className}, bg: ${computed.backgroundColor}, opacity: ${computed.opacity}, zIndex: ${computed.zIndex}, position: ${computed.position}`;
  });

  const elementAtPage = await page.evaluate(() => {
    const main = document.querySelector('main');
    const rect = main.getBoundingClientRect();
    const el = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    if (!el) return 'none';
    const computed = getComputedStyle(el);
    return `tagName: ${el.tagName}, className: ${el.className}, bg: ${computed.backgroundColor}, opacity: ${computed.opacity}, zIndex: ${computed.zIndex}, position: ${computed.position}`;
  });

  console.log("--- START RESULTS ---");
  console.log(JSON.stringify({
    beforeClick,
    afterClick,
    afterSecondClick,
    elementAtHeader,
    elementAtPage
  }, null, 2));
  console.log("--- END RESULTS ---");

  await browser.close();
})();
