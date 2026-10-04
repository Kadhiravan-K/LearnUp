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
  await page.waitForSelector('header'); // Wait for header to load
  await page.waitForTimeout(2000); // Give it time to hydrate and apply themes

  const getMeasurements = async () => {
    return await page.evaluate(() => {
      const html = document.documentElement;
      const htmlStyle = getComputedStyle(html);
      
      // Locate header by the header element
      const header = document.querySelector('header');
      const headerStyle = getComputedStyle(header);
      
      // Main wrapper - find it via its parent or class
      // AppShell structure: .container > .mainWrapper > header + main
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

  // Try to find the button
  let toggleBtn = await page.$('button[aria-label="Switch to Dark Theme"]');
  if (!toggleBtn) {
    toggleBtn = await page.$('button[aria-label="Switch to Light Theme"]');
  }

  if (toggleBtn) {
    await toggleBtn.click();
    await page.waitForTimeout(500);
  }

  const afterClick = await getMeasurements();

  if (toggleBtn) {
    await toggleBtn.click();
    await page.waitForTimeout(500);
  }

  const afterSecondClick = await getMeasurements();

  // Element from point at header center
  const elementsInfo = await page.evaluate(() => {
    const header = document.querySelector('header');
    const hRect = header.getBoundingClientRect();
    const elHeader = document.elementFromPoint(hRect.left + hRect.width / 2, hRect.top + hRect.height / 2);
    
    let headerOverride = '';
    if (elHeader) {
      const computed = getComputedStyle(elHeader);
      headerOverride = `tagName: ${elHeader.tagName}, className: ${elHeader.className}, bg: ${computed.backgroundColor}, opacity: ${computed.opacity}, zIndex: ${computed.zIndex}, position: ${computed.position}`;
    }

    return { headerOverride };
  });

  console.log("--- START RESULTS ---");
  console.log(JSON.stringify({
    beforeClick,
    afterClick,
    afterSecondClick,
    elementsInfo
  }, null, 2));
  console.log("--- END RESULTS ---");

  await browser.close();
})();
