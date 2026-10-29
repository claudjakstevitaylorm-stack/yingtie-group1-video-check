export const SUBTITLE_BOUNDARY=.64;
// Standalone booking controls are evidence of an interface, not spoken captions.
export function isInterfaceText(text){const s=text.trim().replace(/\s+/g,' ');return /^(?:buy tickets|train\s*[&+]\s*hotel cashback|total for\s+\d+\s+(?:adult|child)s?|add railcard|promo codes|available for (?:gbp|eur).*|no booking fees\s*[-–—|]\s*price promise|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+20\d{2}.*)$/i.test(s);}
export function comparisonText(text){return (text||'').split(/\n+/).filter(t=>!isInterfaceText(t)).join('\n');}
export function splitScreenText(data,height){
 const subtitles=[],overlays=[],unassigned=[],interfaceText=[];
 const lines=(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>p.lines||[]));
 const anchors=lines.filter(l=>l.confidence>=65&&isInterfaceText(l.text||'')),sizes=anchors.map(l=>(l.bbox?.y1||0)-(l.bbox?.y0||0)).filter(n=>n>0).sort((a,b)=>a-b),uiHeight=sizes[Math.floor(sizes.length/2)]||0;
 for(const line of lines){const text=(line.text||'').trim();if(!text||!(line.confidence>=65))continue;const box=line.bbox,tokens=text.toLowerCase().match(/[a-z']+/g)||[],smallUI=anchors.length>=3&&uiHeight>0&&box&&box.y1-box.y0<=uiHeight*1.2&&tokens.length<=8;
 if(isInterfaceText(text)||smallUI){interfaceText.push(text);continue;}
 if(tokens.join('').length<6||tokens.filter(w=>w.length>=2).length<2&&!(tokens.length===1&&tokens[0].length>=6&&line.confidence>=85))continue;
 if(!box||!Number.isFinite(box.y0)||!Number.isFinite(box.y1)||!(height>0)){unassigned.push(text);continue;}
 ((box.y0+box.y1)/2>=height*SUBTITLE_BOUNDARY?subtitles:overlays).push(text);
 }
 if(!lines.length&&data.text?.trim())unassigned.push(data.text.trim());
 return{subtitles:subtitles.join('\n'),overlays:overlays.join('\n'),interfaceText:interfaceText.join('\n'),unassigned:unassigned.join('\n')};
}
