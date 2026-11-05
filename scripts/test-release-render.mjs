import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('work', { recursive: true });
const result = await build({
  stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import assert from 'node:assert/strict';
    import Carousel from './modules/promotions/HomepageCarousel';
    import FeaturedSpecials from './modules/specials/FeaturedSpecials';
    import { defaultSettings, heroImage } from './config/defaults';
    import { seedProducts } from './data/products';
    const originalImage = heroImage.replaceAll('&', '&amp;');
    const now = Date.now();
    const slide = { id:'probe', slide_type:'cover', display_mode:'slider', title:'Custom cover', description:'', image_url:'https://example.com/custom.jpg', cta_text:'', cta_url:'', active:true, start_at:new Date(now-10000).toISOString(), end_at:new Date(now+10000).toISOString(), priority:0, created_at:'', updated_at:'' };
    const render = (slides, include=false) => renderToStaticMarkup(<Carousel slides={slides} settings={{...defaultSettings,include_original_homepage_cover:include}} />);
    assert.ok(render([]).includes(originalImage));
    assert.ok(render([{...slide,active:false}]).includes(originalImage));
    assert.ok(!render([slide]).includes(originalImage));
    assert.ok(render([slide]).includes('Custom cover'));
    const multi=render([slide,{...slide,id:'second'}]);
    assert.ok(multi.includes('Next homepage slide'));
    assert.ok(multi.includes('Show slide 2'));
    assert.ok(render([{...slide,end_at:new Date(now-1).toISOString()}]).includes(originalImage));
    assert.ok(render([slide],true).includes(originalImage));
    assert.ok(render([slide],true).includes('Show slide 2'));
    const special={id:'legacy',product_id:seedProducts[0].id,occasion:'Probe',headline:'Existing seasonal feature',description:'Existing content',hero_image:'',active:true,start_date:new Date(now-86400000).toISOString().slice(0,10),end_date:new Date(now+86400000).toISOString().slice(0,10),priority:1};
    const legacy=(enabled=true, products=seedProducts)=>renderToStaticMarkup(<FeaturedSpecials specials={[special]} products={products} enabled={enabled} onView={()=>{}} />);
    assert.ok(legacy().includes('Existing seasonal feature'));
    assert.equal(legacy(false),'');
    assert.equal(legacy(true,seedProducts.map(p=>({...p,active:false}))), '');
    console.log('PASS: rendered original/no-active/one/multiple/expired/optional-original cover states and independent legacy seasonal showcase.');
  ` },
  outfile:'work/release-render.test.mjs', bundle:true, platform:'node', format:'esm', packages:'external', jsx:'automatic',
  plugins:[{name:'link-render-only',setup(b){b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'render-only'}));b.onLoad({filter:/.*/,namespace:'render-only'},()=>({contents:`import React from 'react'; export default function Link({children,...props}){return React.createElement('a',props,children)}`,loader:'js',resolveDir:process.cwd()}));}}],
});
await import('../work/release-render.test.mjs');
