// Position-based screen text grouping, not semantic subtitle classification.
export const SUBTITLE_BOUNDARY=.68;
export function splitScreenText(data,height){
 const subtitles=[],overlays=[],unassigned=[];
 const lines=(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>p.lines||[]));
 for(const line of lines){const text=(line.text||'').trim();if(!text||!(line.confidence>=65))continue;const tokens=text.toLowerCase().match(/[a-z']+/g)||[];if(tokens.join('').length<6||tokens.filter(w=>w.length>=2).length<2&&!(tokens.length===1&&tokens[0].length>=6&&line.confidence>=85))continue;const box=line.bbox;if(!box||!Number.isFinite(box.y0)||!Number.isFinite(box.y1)||!(height>0)){unassigned.push(text);continue;}((box.y0+box.y1)/2>=height*SUBTITLE_BOUNDARY?subtitles:overlays).push(text);}
 if(!lines.length&&data.text?.trim())unassigned.push(data.text.trim());
 return{subtitles:subtitles.join('\n'),overlays:overlays.join('\n'),unassigned:unassigned.join('\n')};
}
