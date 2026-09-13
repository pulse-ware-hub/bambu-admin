import { useState, useMemo, useEffect } from "react";
import DevisPage from "./DevisPage.jsx";
import SuiviPage from "./SuiviPage.jsx";
import HotendPage from "./HotendPage.jsx";
import InventairePage from "./InventairePage.jsx";
import PrinterPage from "./PrinterPage.jsx";
import { T } from "./tokens.js";
import { ThemeToggle } from "./ThemeContext.jsx";
import { useLanguage, LanguageToggle } from "./LanguageContext.jsx";
import NAV from "./data/nav.json";
import ENVIRONMENTS from "./data/environments.json";
import USECASES from "./data/usecases.json";
import NOZZLE_OPTIONS from "./data/nozzle-options.json";
import CATS from "./data/filament-categories.json";
import PRINTER_MODELS from "./data/printer-models.json";
import { FILAMENTS, NOZZLE_KEYS } from "./data/filaments.js";


// ═══════════════════════════════════════════════════════════════
// PAGES VIDES (en attente de contenu)
// ═══════════════════════════════════════════════════════════════
function PlaceholderPage({ page }) {
  const { t } = useLanguage();
  const config = {
    prix: {
      icon: "🏷️",
      title: t("placeholder.prix.title"),
      subtitle: t("placeholder.prix.subtitle"),
      color: T.green,
      sections: [
        { icon: "⚖️", label: t("placeholder.prix.s1.label"), desc: t("placeholder.prix.s1.desc") },
        { icon: "⏱️", label: t("placeholder.prix.s2.label"), desc: t("placeholder.prix.s2.desc") },
        { icon: "💡", label: t("placeholder.prix.s3.label"), desc: t("placeholder.prix.s3.desc") },
        { icon: "🔩", label: t("placeholder.prix.s4.label"), desc: t("placeholder.prix.s4.desc") },
        { icon: "📦", label: t("placeholder.prix.s5.label"), desc: t("placeholder.prix.s5.desc") },
        { icon: "💰", label: t("placeholder.prix.s6.label"), desc: t("placeholder.prix.s6.desc") },
      ],
    },
    devis: {
      icon: "📋",
      title: t("placeholder.devis.title"),
      subtitle: t("placeholder.devis.subtitle"),
      color: T.cyan,
      sections: [
        { icon: "👤", label: t("placeholder.devis.s1.label"), desc: t("placeholder.devis.s1.desc") },
        { icon: "📐", label: t("placeholder.devis.s2.label"), desc: t("placeholder.devis.s2.desc") },
        { icon: "🖼️", label: t("placeholder.devis.s3.label"), desc: t("placeholder.devis.s3.desc") },
        { icon: "💶", label: t("placeholder.devis.s4.label"), desc: t("placeholder.devis.s4.desc") },
        { icon: "📅", label: t("placeholder.devis.s5.label"), desc: t("placeholder.devis.s5.desc") },
        { icon: "📤", label: t("placeholder.devis.s6.label"), desc: t("placeholder.devis.s6.desc") },
      ],
    },
    facture: {
      icon: "🧾",
      title: t("placeholder.facture.title"),
      subtitle: t("placeholder.facture.subtitle"),
      color: T.gold,
      sections: [
        { icon: "🔢", label: t("placeholder.facture.s1.label"), desc: t("placeholder.facture.s1.desc") },
        { icon: "🔗", label: t("placeholder.facture.s2.label"), desc: t("placeholder.facture.s2.desc") },
        { icon: "💳", label: t("placeholder.facture.s3.label"), desc: t("placeholder.facture.s3.desc") },
        { icon: "📊", label: t("placeholder.facture.s4.label"), desc: t("placeholder.facture.s4.desc") },
        { icon: "📁", label: t("placeholder.facture.s5.label"), desc: t("placeholder.facture.s5.desc") },
        { icon: "📬", label: t("placeholder.facture.s6.label"), desc: t("placeholder.facture.s6.desc") },
      ],
    },
    maintenance: {
      icon: "🔧",
      title: t("placeholder.maintenance.title"),
      subtitle: t("placeholder.maintenance.subtitle"),
      color: T.orange,
      sections: [
        { icon: "🖨️", label: t("placeholder.maintenance.s1.label"), desc: t("placeholder.maintenance.s1.desc") },
        { icon: "🗓️", label: t("placeholder.maintenance.s2.label"), desc: t("placeholder.maintenance.s2.desc") },
        { icon: "📋", label: t("placeholder.maintenance.s3.label"), desc: t("placeholder.maintenance.s3.desc") },
        { icon: "🔩", label: t("placeholder.maintenance.s4.label"), desc: t("placeholder.maintenance.s4.desc") },
        { icon: "⚠️", label: t("placeholder.maintenance.s5.label"), desc: t("placeholder.maintenance.s5.desc") },
        { icon: "📈", label: t("placeholder.maintenance.s6.label"), desc: t("placeholder.maintenance.s6.desc") },
      ],
    },
  };

  const c = config[page];

  return (
    <div style={{ padding: "32px 28px", maxWidth: 860 }}>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `${c.color}18`, border: `1px solid ${c.color}40`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
          }}>{c.icon}</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.text }}>{c.title}</h1>
            <div style={{ fontSize: 16, color: T.muted, marginTop: 2 }}>{c.subtitle}</div>
          </div>
        </div>

        {/* Bandeau "en attente" */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", borderRadius: 10,
          background: `${c.color}0d`, border: `1px solid ${c.color}25`,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: c.color, flexShrink: 0,
            boxShadow: `0 0 8px ${c.color}`,
            animation: "pulse 2s infinite",
          }}/>
          <div style={{ fontSize: 15, color: c.color, fontWeight: 600 }}>
            {t("placeholder.badge")}
          </div>
        </div>
      </div>

      {/* Sections prévues */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.dim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
          {t("placeholder.modules")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {c.sections.map((s, i) => (
            <div key={i} style={{
              padding: "14px 16px", borderRadius: 12,
              background: T.card, border: `1px solid ${T.border}`,
              display: "flex", gap: 12, alignItems: "flex-start",
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: `${c.color}10`, border: `1px solid ${c.color}20`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19,
              }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.4 }}>{s.desc}</div>
              </div>
              <div style={{
                marginLeft: "auto", flexShrink: 0,
                width: 18, height: 18, borderRadius: 9,
                border: `1px dashed ${T.dim}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, color: T.dim,
              }}>⏸</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE FILAMENTS (intégrale)
// ═══════════════════════════════════════════════════════════════
function getSupportFor(f){
  if(f.category==="Support")return null;
  if(["PLA","PETG"].includes(f.category))return FILAMENTS.find(x=>x.id==="SUP_PLA_PETG");
  if(f.category==="ABS/ASA")return FILAMENTS.find(x=>x.id==="SUP_ABS");
  if(["PA","PC","PET","PPA","PPS"].includes(f.category))return FILAMENTS.find(x=>x.id==="SUP_PA_PET");
  return null;
}

function calcScore(f,envs,uses,nozzles){
  if(f.category==="Support")return -1;
  let s=0;
  envs.forEach(e=>{if(f.envs.includes(e))s+=2;});
  uses.forEach(u=>{if(f.usecases.includes(u))s+=3;});
  if(nozzles.length>0&&nozzles.some(n=>f.nozzles[n]?.compatible))s+=1;
  return s;
}

function Bar({value,max=5,color}){
  return(
    <div style={{display:"flex",gap:3}}>
      {Array.from({length:max}).map((_,i)=>(
        <div key={i} style={{width:11,height:4,borderRadius:2,
          background:i<value?color:"rgba(255,255,255,0.07)"}}/>
      ))}
    </div>
  );
}

function NozzlePill({id,info}){
  if(!info?.compatible)return null;
  return(
    <span title={info.note} style={{
      display:"inline-flex",alignItems:"center",gap:3,
      padding:"2px 7px",borderRadius:20,fontSize:11,fontWeight:700,
      background:info.recommended?"rgba(99,102,241,0.18)":"rgba(255,255,255,0.04)",
      border:`1px solid ${info.recommended?"rgba(99,102,241,0.45)":"rgba(255,255,255,0.08)"}`,
      color:info.recommended?"#7182d6":"#475569",
    }}>
      {info.recommended&&<span style={{color:"#fbbf24"}}>🔩</span>}
      {id.replace("_"," ")}
    </span>
  );
}

function FilamentCard({f,support,inclSupport,rank,vortekReady}){
  const [open,setOpen]=useState(false);
  const { t }=useLanguage();
  const isSupport=f.category==="Support";
  const totalPrice=inclSupport&&support?f.priceEur+support.priceEur:f.priceEur;
  const priceNote=f.weightG<1000?`${f.weightG}g`:"1kg";
  return(
    <div style={{
      background:rank===0?"rgba(99,102,241,0.06)":"rgba(255,255,255,0.02)",
      border:`1px solid ${rank===0?"rgba(99,102,241,0.22)":T.border}`,
      borderRadius:12,overflow:"hidden",
    }}>
      <div onClick={()=>setOpen(!open)} style={{
        display:"flex",alignItems:"center",gap:10,padding:"12px 16px",
        cursor:"pointer",userSelect:"none",
      }}>
        {rank===0&&<div style={{
          width:18,height:18,borderRadius:9,flexShrink:0,
          background:"linear-gradient(135deg,#fbbf24,#f59e0b)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:11,fontWeight:800,color:"#000",
        }}>★</div>}
        <div style={{width:9,height:9,borderRadius:"50%",flexShrink:0,
          background:f.color,boxShadow:`0 0 6px ${f.color}55`}}/>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
            <span style={{fontWeight:700,fontSize:15,color:T.text}}>{f.name}</span>
            <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.06em",
              padding:"2px 6px",borderRadius:20,
              background:`${f.badgeColor}18`,border:`1px solid ${f.badgeColor}40`,
              color:f.badgeColor,textTransform:"uppercase"}}>{f.badge}</span>
            {f.tempGroup==="high"&&<span style={{fontSize:10,color:"#f87171",
              padding:"2px 6px",background:"rgba(239,68,68,0.08)",
              border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,fontWeight:700}}>🔥 HT</span>}
            {vortekReady&&<span style={{fontSize:10,color:"#a78bfa",
              padding:"2px 6px",background:"rgba(139,92,246,0.08)",
              border:"1px solid rgba(139,92,246,0.25)",borderRadius:10,fontWeight:700}}>{t("filament.card.vortekReady")}</span>}
          </div>
          <div style={{fontSize:12,color:T.muted,marginTop:2,lineHeight:1.3}}>{f.description}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:17,fontWeight:800,color:T.text}}>~{totalPrice}€</div>
          <div style={{fontSize:11,color:T.dim}}>{inclSupport&&support?`+support/${priceNote}`:`/${priceNote}`}</div>
        </div>
        <div style={{color:T.dim,fontSize:13,marginLeft:4}}>{open?"▲":"▼"}</div>
      </div>
      {open&&(
        <div style={{borderTop:`1px solid ${T.border}`,padding:"14px 16px",display:"flex",flexDirection:"column",gap:14}}>
          {/* H2C spécifique */}
          <div style={{padding:"9px 12px",background:"rgba(99,102,241,0.06)",
            border:"1px solid rgba(99,102,241,0.15)",borderRadius:9}}>
            <div style={{fontSize:13,fontWeight:700,color:"#6366f1",marginBottom:3}}>🖨️ H2C</div>
            <div style={{fontSize:14,color:"#7182d6",lineHeight:1.5}}>{f.h2cNotes}</div>
          </div>
          <div style={{ display:"flex"}}>
            <div style={{ display:"flex",flexDirection:"row"}}>
              <div>
                {/* Props */}
                <div>
                  <Lbl>{t("filament.card.props")}</Lbl>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px 24px"}}>
                    {[[t("filament.card.props.heat"),f.props.heat,"#f87171"],[t("filament.card.props.strength"),f.props.strength,"#60a5fa"],
                      [t("filament.card.props.flex"),f.props.flex,"#34d399"],[t("filament.card.props.uv"),f.props.uv,"#fbbf24"],
                      [t("filament.card.props.chem"),f.props.chem,"#a78bfa"],[t("filament.card.props.ease"),f.props.ease,"#4ade80"]].map(([l,v,c])=>(
                      <div key={l}><div style={{fontSize:13,color:T.dim,marginBottom:2}}>{l}</div><Bar value={v} color={c}/></div>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ paddingLeft:"20px"}}>

                {/* Réglages */}
                <div>
                  <Lbl>{t("filament.card.settings")}</Lbl>
                    <div style={{ display:"flex"}}>
                      <div style={{ display:"flex",flexDirection:"row"}}>
                        <div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px 14px"}}>
                            {[[t("filament.card.set.nozzle"),f.print.nozzleTemp],[t("filament.card.set.bed"),f.print.bedTemp],
                              [t("filament.card.set.speed"),f.print.speed],[t("filament.card.set.vent"),f.print.vent],
                              [t("filament.card.set.dry"),f.print.dry],[t("filament.card.set.moisture"),f.print.moisture]].map(([l,v])=>(
                              <div style={{display:"inline-flex"}} key={l}>
                                <div style={{fontSize:13,color:T.dim,paddingRight: "10px"}}>{l}: </div>
                                <div style={{fontSize:13,color:"#94a3b8",fontWeight:500,lineHeight:1.3}}>{v}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div style={{padding:"6px 9px",border:"1px solid rgba(99, 102, 241, 0.15)",borderRadius:7,fontSize:12,color:"#475569",lineHeight:1.5}}>
                            <div style={{fontSize:13,paddingRight: "10px",color:"#94a3b8"}}>{t("filament.card.enclosure")} <b>{f.print.enclosure}</b></div>
                            <div style={{fontSize:13,paddingRight: "10px",color:"#94a3b8"}}>{t("filament.card.plates")} <b>{f.print.plates.join(", ")}</b></div>
                          </div>
                          {/* Warnings */}
                          {f.warnings.length>0&&(
                            <div style={{paddingTop:"9px"}}>
                              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                                {f.warnings.map((w,i)=>(
                                  <div key={i} style={{fontSize:13,color:"#fa8989",
                                    padding:"3px 8px",background:"rgba(239,68,68,0.07)", marginBottom: "3px",
                                    border:"1px solid rgba(239,68,68,0.16)",borderRadius:5}}>⚠️ {w}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                </div>

              </div>
            </div>
          </div>


          {/* Buses */}
          <div>
            <Lbl>{t("filament.card.nozzles")}</Lbl>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {NOZZLE_KEYS.map(k=><NozzlePill key={k} id={k} info={f.nozzles[k]}/>)}
            </div>
            <div style={{marginTop:6,padding:"6px 9px",
              background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.15)",
              borderRadius:7,fontSize:11,color:"#818cf8"}}>
              🔄 <b>{t("filament.card.vortekColon")}</b> {f.vortek}
            </div>
          </div>
          {/* Support */}
          {!isSupport&&support&&(
            <div>
              <Lbl>{t("filament.card.support")}</Lbl>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"7px 10px",background:"rgba(255,255,255,0.02)", border:`1px solid ${T.border}`,borderRadius:7}}>
                <span style={{fontSize:13,color:"#94a3b8"}}>{support.name}</span>
                <span style={{fontSize:13,fontWeight:700,color:"#64748b"}}>~{support.priceEur}€/kg</span>
              </div>
            </div>
          )}
          {/* Coût */}
          <div style={{borderTop:`1px solid ${T.border}`,paddingTop:10}}>
            <Lbl>{t("filament.card.cost")}</Lbl>
            <Rw l={`${f.name} (${priceNote})`} v={`~${f.priceEur}€`}/>
            {inclSupport&&support&&<Rw l={`${support.name} (1kg)`} v={`~${support.priceEur}€`}/>}
            <div style={{display:"flex",justifyContent:"space-between", borderTop:`1px solid ${T.border}`, paddingTop:5,marginTop:10,marginBottom:3}}>
              <span style={{fontSize:13,fontWeight:800,color:T.text}}>{t("filament.card.total")}</span>
              <span style={{fontSize:14,fontWeight:800,color:T.text}}>~{totalPrice}€</span>
            </div>
            <div style={{fontSize:11,color:T.dim,marginTop:2}}>
              {t("filament.card.priceNote")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function Lbl({children}){return <div style={{fontSize:12,fontWeight:700,color:T.dim,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>{children}</div>;}
function Rw({l,v}){return <div style={{display:"flex",justifyContent:"space-between",fontSize:13,paddingTop:5,color:"#64748b"}}><span>{l}</span><span style={{fontWeight:600,color:"#94a3b8"}}>{v}</span></div>;}

function FilamentPage({printer}){
  const { t, lang }=useLanguage();
  const [envs,setEnvs]=useState([]);
  const [uses,setUses]=useState([]);
  const [nozzles,setNozzles]=useState(["0.4mm"]);
  const [inclSupport,setInclSupport]=useState(true);
  const [catFilter,setCatFilter]=useState("Tous");
  const [showAll,setShowAll]=useState(false);

  const tog=(arr,set,id)=>set(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  // Contraintes imprimante sélectionnée : caisson (haute T°) + double buse Vortek
  const isEnclosed=!printer?.enclosure||printer.enclosure!=="not_enclose";
  const hasDualNozzle=printer?.nozzle==="dual_nozzle";
  const restrictOpen=!!printer&&!isEnclosed;

  const baseFilaments=useMemo(()=>{
    if(!restrictOpen)return FILAMENTS;
    return FILAMENTS.filter(f=>!f.print.chamberReq);
  },[restrictOpen]);

  const results=useMemo(()=>{
    if(!envs.length&&!uses.length)return null;
    return baseFilaments
      .map(f=>({f,s:calcScore(f,envs,uses,nozzles)}))
      .filter(x=>x.s>0)
      .sort((a,b)=>b.s-a.s);
  },[baseFilaments,envs,uses,nozzles]);

  const filtered=useMemo(()=>{
    if(!results)return null;
    let r=catFilter==="Tous"?results:results.filter(x=>x.f.category===catFilter);
    return showAll?r:r.slice(0,8);
  },[results,catFilter,showAll]);

  const hasR=filtered&&filtered.length>0;

  return(
    <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
      {printer&&(
        <div style={{
          flexShrink:0,padding:"8px 18px",
          borderBottom:`1px solid ${T.border}`,
          background:"rgba(99,102,241,0.05)",
          fontSize:12,color:T.muted,
          display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",
        }}>
          <span>{t("filament.printerFilter.filtered")} <b style={{color:T.text}}>{printer.name}</b></span>
          {restrictOpen&&<span style={{color:"#f87171"}}>{t("filament.printerFilter.chamberHidden")}</span>}
          {hasDualNozzle&&<span style={{color:"#a78bfa"}}>{t("filament.printerFilter.dualNozzle")}</span>}
        </div>
      )}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
      {/* Panneau gauche */}
      <div style={{
        width:290,flexShrink:0,
        borderRight:`1px solid ${T.border}`,
        overflowY:"auto",padding:"14px 12px",
        display:"flex",flexDirection:"column",gap:18,
      }}>
        <Sect title={t("filament.section.env")}>
          {ENVIRONMENTS.map(e=>(
            <Chip key={e.id} active={envs.includes(e.id)}
              onClick={()=>tog(envs,setEnvs,e.id)}
              icon={e.icon} label={e.label[lang]} sub={e.desc[lang]}/>
          ))}
        </Sect>
        <Sect title={t("filament.section.usage")}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
            {USECASES.map(u=>(
              <button key={u.id} onClick={()=>tog(uses,setUses,u.id)} style={{
                display:"flex",alignItems:"center",gap:4,padding:"5px 7px",
                borderRadius:6,fontSize:11,fontWeight:600,textAlign:"left",
                border:`1px solid ${uses.includes(u.id)?"rgba(99,102,241,0.5)":T.border}`,
                background:uses.includes(u.id)?T.accentLo:"rgba(255,255,255,0.02)",
                color:uses.includes(u.id)?"#7182d6":T.muted,cursor:"pointer",
              }}>
                <span>{u.icon}</span><span style={{lineHeight:1.2}}>{u.label[lang]}</span>
              </button>
            ))}
          </div>
        </Sect>
        <Sect title={t("filament.section.nozzle")}>
          {NOZZLE_OPTIONS.map(n=>(
            <button key={n.id} onClick={()=>tog(nozzles,setNozzles,n.id)} style={{
              display:"flex",alignItems:"center",gap:7,padding:"6px 9px",
              borderRadius:7,width:"100%",textAlign:"left",
              border:`1px solid ${nozzles.includes(n.id)?"rgba(99,102,241,0.5)":T.border}`,
              background:nozzles.includes(n.id)?T.accentLo:"rgba(255,255,255,0.02)",
              cursor:"pointer",
            }}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:600,color:nozzles.includes(n.id)?"#7182d6":"#64748b"}}>
                  {n.label[lang]}
                  {n.isDefault&&<span style={{marginLeft:4,fontSize:10,color:T.accent,fontWeight:800}}>{t("filament.nozzle.default")}</span>}
                </div>
                <div style={{fontSize:10,color:T.dim}}>{n.detail[lang]}</div>
              </div>
              {nozzles.includes(n.id)&&<span style={{color:T.accent,fontSize:11}}>✓</span>}
            </button>
          ))}
        </Sect>
        <Sect title={t("filament.section.cost")}>
          <button onClick={()=>setInclSupport(!inclSupport)} style={{
            display:"flex",alignItems:"center",gap:7,padding:"8px 9px",
            borderRadius:7,width:"100%",textAlign:"left",
            border:`1px solid ${inclSupport?"rgba(99,102,241,0.4)":T.border}`,
            background:inclSupport?T.accentLo:"rgba(255,255,255,0.02)",
            cursor:"pointer",
          }}>
            <div style={{
              width:14,height:14,borderRadius:4,flexShrink:0,
              border:`2px solid ${inclSupport?T.accent:T.dim}`,
              background:inclSupport?T.accent:"transparent",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:11,color:"#fff",
            }}>{inclSupport&&"✓"}</div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:inclSupport?"#7182d6":"#475569"}}>{t("filament.cost.label")}</div>
              <div style={{fontSize:10,color:T.dim}}>{t("filament.cost.desc")}</div>
            </div>
          </button>
        </Sect>
        {(envs.length>0||uses.length>0)&&(
          <button onClick={()=>{setEnvs([]);setUses([]);setShowAll(false);}} style={{
            padding:"6px",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:600,
            border:"1px solid rgba(239,68,68,0.2)",background:"rgba(239,68,68,0.06)",color:"#ef4444",
          }}>{t("filament.reset")}</button>
        )}
      </div>

      {/* Résultats */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
        {!hasR?(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",
            justifyContent:"center",height:"100%",minHeight:360,gap:10}}>
            <div style={{fontSize:40}}>🧵</div>
            <div style={{fontSize:14,fontWeight:700,color:T.dim}}>{t("filament.placeholder.title")}</div>
            <div style={{fontSize:13,color:"#1d3469",textAlign:"center",maxWidth:500,lineHeight:1.5}}>
              {t("filament.placeholder.pre")} {baseFilaments.filter(f=>f.category!=="Support").length} {t("filament.placeholder.post")}
            </div>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {CATS.map(c=>(
                <button key={c} onClick={()=>setCatFilter(c)} style={{
                  padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:700,
                  border:`1px solid ${catFilter===c?"rgba(99,102,241,0.6)":T.border}`,
                  background:catFilter===c?"rgba(99,102,241,0.18)":"rgba(255,255,255,0.02)",
                  color:catFilter===c?"#7182d6":T.muted,cursor:"pointer",
                }}>{c==="Tous"?t("cats.all"):c}</button>
              ))}
            </div>
            <div style={{
              padding:"9px 12px",borderRadius:9,
              background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.14)",
              fontSize:12,color:T.muted,lineHeight:1.5,
            }}>
              <span style={{color:"#818cf8",fontWeight:700}}>{filtered.length} {t("filament.results.unit")}{filtered.length>1?"s":""}</span>
              {" · "}{t("filament.results.hint")}
              <span style={{display:"block",marginTop:3,fontSize:12,color:T.dim}}>
                {t("filament.results.warningMix")}
              </span>
            </div>
            {filtered[0]&&(
              <div style={{padding:"7px 11px",borderRadius:8,
                background:"rgba(255, 243, 212, 0.05)",border:"1px solid rgba(251,191,36,0.12)",
                fontSize:12,color:"#fbbf24"}}>
                ⭐ <b>{t("filament.results.best")}</b> {filtered[0].f.name} —{" "}
                {filtered[0].f.print.chamberReq?t("filament.results.chamberActive"):t("filament.results.noChamber")}
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {filtered.map(({f},i)=>(
                <FilamentCard key={f.id} f={f} support={getSupportFor(f)}
                  inclSupport={inclSupport} rank={i}
                  vortekReady={hasDualNozzle&&f.vortek.includes("⭐")}/>
              ))}
            </div>
            {!showAll&&results&&results.filter(x=>catFilter==="Tous"||x.f.category===catFilter).length>filtered.length&&(
              <button onClick={()=>setShowAll(true)} style={{
                padding:"9px",borderRadius:9,cursor:"pointer",
                border:`1px solid ${T.border}`,background:"rgba(255,255,255,0.02)",
                fontSize:12,fontWeight:600,color:T.muted,
              }}>{t("filament.results.showAll")}</button>
            )}
            <div style={{
              padding:"10px 12px",borderRadius:9,
              background:"rgba(99,102,241,0.03)",border:`1px solid ${T.border}`,
              fontSize:12,color:T.dim,lineHeight:1.6,
            }}>
              <div style={{ display:"flex"}}>
                <div style={{ display:"flex",flexDirection:"row"}}>
                  <div>🔄 <b style={{color:"#4f46e5"}}>{t("filament.vortek.title")}</b></div>
                  <div style={{ paddingLeft:"20px"}}>
                    <div>{t("filament.vortek.l1")}</div>
                    <div>{t("filament.vortek.l2")} </div>
                    <div>{t("filament.vortek.l3")} </div>
                    <div>{t("filament.vortek.l4")}</div>
                    <div>{t("filament.vortek.l5")} </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function Sect({title,children}){
  return(
    <div>
      <div style={{fontSize:10,fontWeight:700,color:T.dim,letterSpacing:"0.08em",
        textTransform:"uppercase",marginBottom:7}}>{title}</div>
      <div style={{display:"flex",flexDirection:"column",gap:3}}>{children}</div>
    </div>
  );
}
function Chip({active,onClick,icon,label,sub}){
  return(
    <button onClick={onClick} style={{
      display:"flex",alignItems:"center",gap:7,padding:"7px 9px",
      borderRadius:8,border:`1px solid ${active?"rgba(99,102,241,0.5)":T.border}`,
      background:active?T.accentLo:"rgba(255,255,255,0.02)",
      cursor:"pointer",textAlign:"left",width:"100%",
    }}>
      <span style={{fontSize:14}}>{icon}</span>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:600,color:active?"#7182d6":"#64748b"}}>{label}</div>
        {sub&&<div style={{fontSize:10,color:T.dim}}>{sub}</div>}
      </div>
      {active&&<span style={{color:T.accent,fontSize:12}}>✓</span>}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// APP PRINCIPALE
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("filament");
  const [editEntry, setEditEntry] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState(null);

  useEffect(() => {
    fetch("/api/printers").then(r => r.json()).then(setPrinters).catch(() => {});
  }, []);

  const activePrinterCfg = printers.find(p => p.id === selectedPrinterId) || null;
  const activePrinterModel = activePrinterCfg ? PRINTER_MODELS.find(m => m.name === activePrinterCfg.model) : null;
  const activePrinter = activePrinterCfg ? {
    id: activePrinterCfg.id,
    name: activePrinterCfg.name,
    model: activePrinterModel?.name || null,
    enclosure: activePrinterModel?.enclosure || null,
    nozzle: activePrinterModel?.nozzle || null,
    vertex: !!activePrinterCfg.vertex || activePrinterModel?.factoryUpgrade === "vortek",
  } : null;

  const handleEditFromSuivi = (entry) => {
    setEditEntry(entry);
    setPage("devis");
  };

  const renderPage = () => {
    if (page === "filament") return <FilamentPage printer={activePrinter} />;
    if (page === "hotend")   return <HotendPage />;
    if (page === "devis")    return <DevisPage editEntry={editEntry} onSaved={() => setEditEntry(null)} />;
    if (page === "suivi")       return <SuiviPage onEdit={handleEditFromSuivi} />;
    if (page === "inventaire")  return <InventairePage />;
    if (page === "imprimante")  return <PrinterPage />;
    return <PlaceholderPage page={page} />;
  };

  const { t, lang } = useLanguage();
  const currentNav = NAV.find(n => n.id === page);

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: T.bg, color: T.text,
      fontFamily: "'Inter','SF Pro Display',system-ui,sans-serif",
    }}>
      {/* SIDEBAR */}
      <div style={{
        width: 220, flexShrink: 0,
        background: T.surface,
        borderRight: `1px solid ${T.border}`,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{
          padding: "18px 16px 14px",
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: "none",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            }}>♾️</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "green", lineHeight: 1 }}>{t("app.sidebar.title")}</div>
              {/* <div style={{ fontSize: 12, color: T.dim, marginTop: 2 }}>H2C · Vortek</div> */}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          {NAV.map(item => {
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => setPage(item.id)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", borderRadius: 9, width: "100%", textAlign: "left",
                border: `1px solid ${active ? T.accentBd : "transparent"}`,
                background: active ? T.accentLo : "transparent",
                cursor: "pointer", transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? "#7182d6" : "#64748b",
                  }}>{item.label[lang]}</div>
                  <div style={{ fontSize: 12, color: T.dim, marginTop: 1 }}>{item.desc[lang]}</div>
                </div>
                {active && <div style={{
                  width: 4, height: 4, borderRadius: 2,
                  background: T.accent, flexShrink: 0,
                }} />}
              </button>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div style={{
          padding: "10px 12px",
          borderTop: `1px solid ${T.border}`,
          fontSize: 11, color: T.dim, lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 700, color: T.muted, marginBottom: 2 }}>{t("app.sidebar.version")}</div>
          {/* <div>Pages : filament ✓ · hotend ✓ · prix ⏸ · devis ✓ · suivi ✓ · facture ⏸ · maintenance ⏸</div> */}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{
          height: 52, flexShrink: 0,
          borderBottom: `1px solid ${T.border}`,
          display: "flex", alignItems: "center",
          padding: "0 20px", gap: 12,
          background: T.surface,
        }}>
          <span style={{ fontSize: 18 }}>{currentNav?.icon}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{currentNav?.label?.[lang]}</div>
            <div style={{ fontSize: 11, color: T.dim }}>{currentNav?.desc?.[lang]}</div>
          </div>
          {page !== "filament" && (
            <div style={{
              marginLeft: "auto",
              padding: "4px 10px", borderRadius: 20,
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.2)",
              fontSize: 11, fontWeight: 700, color: "#fbbf24",
            }}>
              {t("app.topbar.pending")}
            </div>
          )}
          {page === "filament" && printers.length > 0 && (
            <div style={{
              marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap",
            }}>
              <button onClick={() => setSelectedPrinterId(null)} style={{
                padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
                background:!selectedPrinterId?T.accentLo:"rgba(255,255,255,0.02)",
                border:`1px solid ${!selectedPrinterId?T.accentBd:T.border}`,
                color:!selectedPrinterId?"#7182d6":T.muted,
              }}>{t("app.printerFilter.all")}</button>
              {printers.map(p=>(
                <button key={p.id} onClick={() => setSelectedPrinterId(p.id)} style={{
                  padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
                  background:selectedPrinterId===p.id?T.accentLo:"rgba(255,255,255,0.02)",
                  border:`1px solid ${selectedPrinterId===p.id?T.accentBd:T.border}`,
                  color:selectedPrinterId===p.id?"#7182d6":T.muted,
                }}>🖨️ {p.name}</button>
              ))}
            </div>
          )}
          <LanguageToggle />
          <ThemeToggle />
        </div>

        {/* Contenu */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
