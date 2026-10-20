import { defineConfig } from '@playwright/test';
// Linux (cloud) uses the bundled @sparticuz/chromium; other platforms use the installed Google Chrome.
async function launchOptions() {
 if (process.platform !== 'linux') return { channel: 'chrome' };
 const { default: chromium } = await import('@sparticuz/chromium');
 return {executablePath: await chromium.executablePath(), args: chromium.args.filter(arg => !["--single-process", "--disable-web-security", "--allow-running-insecure-content"].includes(arg)), env: {...process.env, XDG_CACHE_HOME: "/tmp/fairway-browser-cache"}};
}
export default defineConfig({
 testDir: './tests/browser', workers: 1,
 use: { baseURL: 'http://127.0.0.1:5174', launchOptions: await launchOptions(), viewport:{width:390,height:844}},
 webServer:{command:'npm run dev -- --port 5174 --strictPort',url:'http://127.0.0.1:5174',reuseExistingServer:false}
});
