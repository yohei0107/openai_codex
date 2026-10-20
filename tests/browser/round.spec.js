import { test, expect } from '@playwright/test';
test('モバイルで設定、3ゲーム、入力修正、保存復元が動作する',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'スコアを記録'})).toBeVisible();
 await page.getByLabel('コース名').fill('グリーンヒル');
 await page.getByLabel('プレイヤー 1',{exact:true}).fill('あおい');
 await page.getByLabel('プレイヤー 2',{exact:true}).fill('けん');
 await page.getByRole('button',{name:'このルールで開始'}).click();
 await expect(page.getByRole('heading',{name:'グリーンヒル'})).toBeVisible();
 for(const [name,value] of [['あおい','4'],['けん','5'],['プレイヤー 3','6'],['プレイヤー 4','3']]){
  await page.getByRole('spinbutton',{name:`${name}のスコア`,exact:true}).fill(value);
  await page.getByRole('spinbutton',{name:`${name}のスコア`,exact:true}).press('Tab');
 }
 await expect(page.getByText('TEAM A が 31 pt 獲得',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'オリンピック'}).click();
 await page.getByLabel('あおいのメダル',{exact:true}).selectOption('gold');
 await page.getByRole('spinbutton',{name:'あおいのパット数',exact:true}).fill('1');
 await page.getByRole('spinbutton',{name:'あおいのパット数',exact:true}).press('Tab');
 await page.getByRole('button',{name:'ゲーム結果',exact:true}).click();
 await expect(page.locator('.rankings>div').first()).toContainText('あおい');
 await expect(page.locator('.rankings>div').first()).toContainText('+4');
 await page.getByRole('button',{name:'スコアマッチ'}).click();
 await expect(page.locator('.rankings>div').first()).toContainText('プレイヤー 4');
 await expect(page.locator('.rankings>div').first()).toContainText('+3');
 await page.reload();
 await expect(page.getByRole('spinbutton',{name:'あおいのスコア',exact:true})).toHaveValue('4');
 await expect(page.getByRole('spinbutton',{name:'あおいのパット数',exact:true})).toHaveValue('1');
 await page.getByRole('button',{name:'次のホールへ'}).click();
 await expect(page.locator('.hole-title>strong')).toHaveText('02');
 await expect(page.locator('.player-name').filter({hasText:'プレイヤー 4'})).toContainText('オナー');
 await page.getByRole('button',{name:'前のホール',exact:true}).click();
 await page.getByRole('spinbutton',{name:'あおいのスコア',exact:true}).fill('2');
 await page.getByRole('spinbutton',{name:'あおいのスコア',exact:true}).press('Tab');
 await expect(page.getByText('TEAM A が 42 pt 獲得',{exact:true})).toBeVisible();
 const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:innerWidth}));
 expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.view);
 await page.screenshot({path:'/tmp/fairway-mobile.png',fullPage:true});
 expect(errors).toEqual([]);
});
test('入力制約とメダル重複を防止し、設定をキャンセルできる',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'このルールで開始'}).click();
 const score=page.getByRole('spinbutton',{name:'プレイヤー 1のスコア',exact:true});
 await score.fill('3');await score.press('Tab');
 const putts=page.getByRole('spinbutton',{name:'プレイヤー 1のパット数',exact:true});
 await putts.fill('4');await putts.press('Tab');
 await expect(page.getByRole('status',{name:'',exact:true})).toContainText('パット数はスコア以下');
 await expect(putts).toHaveValue('');
 await page.getByRole('button',{name:'オリンピック'}).click();
 await page.getByLabel('プレイヤー 1のメダル',{exact:true}).selectOption('gold');
 await page.getByLabel('プレイヤー 2のメダル',{exact:true}).selectOption('gold');
 await expect(page.getByRole('status',{name:'',exact:true})).toContainText('同じメダル');
 await expect(page.getByLabel('プレイヤー 2のメダル',{exact:true})).toHaveValue('');
 await page.getByRole('button',{name:'ラウンド設定',exact:true}).click();
 await page.getByLabel('コース名').fill('キャンセルする名前');
 await page.keyboard.press('Escape');
 await expect(page.getByRole('heading',{name:'プライベートラウンド'})).toBeVisible();
});
test('デスクトップでスコアカードと9ホール設定を利用できる',async({page})=>{
 await page.setViewportSize({width:1440,height:1100});await page.goto('/');
 await page.getByLabel('ホール数',{exact:true}).selectOption('9');
 await page.getByRole('button',{name:'このルールで開始'}).click();
 await page.getByRole('button',{name:'スコアカード',exact:true}).click();
 await expect(page.locator('tbody tr')).toHaveCount(10);
 await page.getByRole('button',{name:'9',exact:true}).click();
 await expect(page.getByRole('button',{name:'次のホール',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'ラウンド結果を見る'})).toBeVisible();
 await page.screenshot({path:'/tmp/fairway-desktop.png',fullPage:true});
});
for (const [mode,expected] of [['double',84],['add',63]]) {
 test(`開始前に${mode}方式を選び、プッシュ・集計・再読込でルールを維持`,async({page})=>{
  await page.goto('/');
  await page.getByLabel('開始前のゾロ目ルール',{exact:true}).selectOption(mode);
  await page.getByRole('button',{name:'このルールで開始'}).click();
  for(const [p,s] of [[1,3],[2,5],[3,5],[4,4]]){
   const input=page.getByRole('spinbutton',{name:`プレイヤー ${p}のスコア`,exact:true});
   await input.fill(String(s));await input.press('Tab');
  }
  await expect(page.getByText('TEAM A が 42 pt 獲得',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'プッシュを1回増やす',exact:true}).click();
  await expect(page.getByText(`TEAM A が ${expected} pt 獲得`,{exact:true})).toBeVisible();
  await expect(page.getByLabel('ラスベガスの計算式')).toContainText(`最終倍率 ${mode==='add'?3:4}`);
  await page.getByRole('button',{name:'ラウンド設定',exact:true}).click();
  await expect(page.getByLabel('開始前のゾロ目ルール',{exact:true})).toBeDisabled();
  await expect(page.getByLabel('開始前のゾロ目ルール',{exact:true})).toHaveValue(mode);
  await page.getByRole('button',{name:'設定を閉じる',exact:true}).click();
  await page.reload();
  await expect(page.getByText(`TEAM A が ${expected} pt 獲得`,{exact:true})).toBeVisible();
  await expect(page.getByLabel('プッシュ回数',{exact:true})).toHaveText('1回');
  await page.getByRole('button',{name:'次のホールへ'}).click();
  await expect(page.getByLabel('プッシュ回数',{exact:true})).toHaveText('0回');
  await page.getByRole('button',{name:'前のホール',exact:true}).click();
  await page.getByRole('button',{name:'プッシュを1回増やす',exact:true}).click();
  await expect(page.getByText(`TEAM A が ${mode==='add'?105:168} pt 獲得`,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'解除',exact:true}).click();
  await expect(page.getByText('TEAM A が 42 pt 獲得',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'プッシュを1回減らす',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'ゲーム結果',exact:true}).click();
  await expect(page.locator('.rankings>div').first()).toContainText('+42');
 });
}
test('旧保存ラウンドの結果を保持し、新規開始時に別のルールを選べる',async({page})=>{
 await page.addInitScript(()=>{
  if(!localStorage.getItem('fairway.round.v1'))localStorage.setItem('fairway.round.v1',JSON.stringify({
   version:1,course:'保存済みコース',names:['A','B','C','D'],count:18,partner:3,
   holes:Array.from({length:18},(_,i)=>({par:4,scores:i===0?[4,5,6,3]:[null,null,null,null],putts:[null,null,null,null],medals:['','','','']}))
  }));
 });
 await page.goto('/');
 await expect(page.getByText('TEAM A が 22 pt 獲得',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'ラウンド設定',exact:true}).click();
 await expect(page.getByLabel('開始前のゾロ目ルール',{exact:true})).toBeDisabled();
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'新しいラウンド',exact:true}).click();
 await expect(page.getByLabel('開始前のゾロ目ルール',{exact:true})).toBeEnabled();
 await page.getByLabel('開始前のゾロ目ルール',{exact:true}).selectOption('add');
 await page.getByRole('button',{name:'このルールで開始'}).click();
 await expect(page.getByText('倍率に1加算',{exact:false}).first()).toBeVisible();
 await expect(page.getByRole('spinbutton',{name:'プレイヤー 1のスコア',exact:true})).toHaveValue('');
});
