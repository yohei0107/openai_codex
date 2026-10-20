import { defineConfig } from '@playwright/test';
import chromium from '@sparticuz/chromium';
export default defineConfig({
 testDir: './tests/browser', workers: 1,
 use: { baseURL: 'http://127.0.0.1:5173', launchOptions: {executablePath: await chromium.executablePath(), args: chromium.args.filter(arg => !["--single-process", "--disable-web-security", "--allow-running-insecure-content"].includes(arg)), env: {...process.env, XDG_CACHE_HOME: "/tmp/fairway-browser-cache"}}, viewport:{width:390,height:844}},
 webServer:{command:'npm run dev -- --port 5173',url:'http://127.0.0.1:5173',reuseExistingServer:true}
});
