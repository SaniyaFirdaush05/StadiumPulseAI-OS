const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

// Update getAiAnalysisText
const textBlock = `
  const getAiAnalysisText = () => {
    let base = selectedCamera.aiAnalysis;
    if (cctvFilter === 'night') return \`[NV MODE] \${base} Low-light enhancement active. No anomalies detected in shadow regions.\`;
    if (cctvFilter === 'thermal') return \`[THERMAL MODE] \${base} Heat signatures nominal. Safe temperature thresholds maintained.\`;
    if (cctvFilter === 'blueprint') return \`[BLUEPRINT MODE] \${base} Spatial mapping verified against structural limits.\`;
    return base;
  };
`;
if (!content.includes('getAiAnalysisText')) {
  content = content.replace("const [cctvFilter, setCctvFilter] = useState<'normal' | 'night' | 'thermal' | 'blueprint'>('normal');", 
  "const [cctvFilter, setCctvFilter] = useState<'normal' | 'night' | 'thermal' | 'blueprint'>('normal');\n" + textBlock);
}

// Update the AI Vision Analysis rendering
content = content.replace(/selectedCamera\.aiAnalysis/g, "getAiAnalysisText()");
// Fix the initial mapping where it was correct
content = content.replace(/getAiAnalysisText\(\) \? /g, "selectedCamera.aiAnalysis ? ");

// Update tracker colors based on mode
content = content.replace(/border-emerald-500\/80/g, "${cctvFilter === 'thermal' ? 'border-yellow-400/80' : cctvFilter === 'blueprint' ? 'border-sky-400/80' : 'border-emerald-500/80'}");
content = content.replace(/bg-emerald-500/g, "${cctvFilter === 'thermal' ? 'bg-yellow-400' : cctvFilter === 'blueprint' ? 'bg-sky-400' : 'bg-emerald-500'}");
content = content.replace(/border-emerald-500\/40/g, "${cctvFilter === 'thermal' ? 'border-yellow-400/40' : cctvFilter === 'blueprint' ? 'border-sky-400/40' : 'border-emerald-500/40'}");

content = content.replace(/className="hud-tracker-1 absolute top-0 left-0 w-16 h-16 border-2 \$\{/g, 'className={`hud-tracker-1 absolute top-0 left-0 w-16 h-16 border-2 ${');
content = content.replace(/\} rounded-sm"/g, '} rounded-sm`}');

content = content.replace(/className="absolute -top-3\.5 left-0 \$\{/g, 'className={`absolute -top-3.5 left-0 ${');
content = content.replace(/\} text-black font-mono font-black text-\[7px\] px-1 rounded uppercase tracking-wider scale-\[0\.8\] origin-left"/g, '} text-black font-mono font-black text-[7px] px-1 rounded uppercase tracking-wider scale-[0.8] origin-left`}');

content = content.replace(/className="absolute inset-1\/2 -translate-x-1\/2 -translate-y-1\/2 w-3 h-3 border \$\{/g, 'className={`absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 border ${');
content = content.replace(/\} rounded-full"/g, '} rounded-full`}');


fs.writeFileSync('src/components/DashboardView.tsx', content);
