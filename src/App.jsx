import { useState } from "react";

const airports = [
  { code:"GRU",name:"São Paulo (Guarulhos)"},{code:"CGH",name:"São Paulo (Congonhas)"},
  {code:"GIG",name:"Rio de Janeiro (Galeão)"},{code:"SDU",name:"Rio de Janeiro (Santos Dumont)"},
  {code:"BSB",name:"Brasília"},{code:"SSA",name:"Salvador"},{code:"FOR",name:"Fortaleza"},
  {code:"REC",name:"Recife"},{code:"BEL",name:"Belém"},{code:"MAO",name:"Manaus"},
  {code:"CWB",name:"Curitiba"},{code:"POA",name:"Porto Alegre"},{code:"FLN",name:"Florianópolis"},
  {code:"THE",name:"Teresina"},{code:"JPA",name:"João Pessoa (Paraíba)"},{code:"LDB",name:"Londrina"},
  {code:"MIA",name:"Miami"},{code:"JFK",name:"Nova York (JFK)"},{code:"LAX",name:"Los Angeles"},
  {code:"LIS",name:"Lisboa"},{code:"MAD",name:"Madrid"},{code:"LHR",name:"Londres"},
  {code:"CDG",name:"Paris"},{code:"FCO",name:"Roma"},{code:"MXP",name:"Milão"},
  {code:"AMS",name:"Amsterdam"},{code:"FRA",name:"Frankfurt"},{code:"BCN",name:"Barcelona"},
  {code:"EZE",name:"Buenos Aires"},{code:"SCL",name:"Santiago"},{code:"BOG",name:"Bogotá"},
  {code:"LIM",name:"Lima"},{code:"MEX",name:"Cidade do México"},
  {code:"PEK",name:"Pequim (Capital)"},{code:"PVG",name:"Xangai (Pudong)"},
  {code:"CAN",name:"Guangzhou"},{code:"SZX",name:"Shenzhen"},{code:"CTU",name:"Chengdu"},
  {code:"NRT",name:"Tóquio (Narita)"},{code:"HND",name:"Tóquio (Haneda)"},
  {code:"KIX",name:"Osaka (Kansai)"},{code:"NGO",name:"Nagoya"},
  {code:"BKK",name:"Bangkok (Suvarnabhumi)"},{code:"DMK",name:"Bangkok (Don Mueang)"},
  {code:"HKT",name:"Phuket"},{code:"CNX",name:"Chiang Mai"},
  {code:"HKG",name:"Hong Kong"},{code:"SIN",name:"Singapura"},
  {code:"KUL",name:"Kuala Lumpur"},{code:"ICN",name:"Seul (Incheon)"},
  {code:"TPE",name:"Taipei"},{code:"DPS",name:"Bali (Denpasar)"},
  {code:"CGK",name:"Jacarta"},{code:"MNL",name:"Manila"},
  {code:"DEL",name:"Nova Delhi"},{code:"BOM",name:"Mumbai"},
  {code:"DXB",name:"Dubai"},{code:"DOH",name:"Doha"},
];

const fmtBRL = v => `R$ ${parseFloat(v).toLocaleString("pt-BR",{minimumFractionDigits:2})}`;
const today = () => new Date().toISOString().split("T")[0];
const getDays = (y,m) => { const n=new Date(y,m+1,0).getDate(); return Array.from({length:n},(_,i)=>new Date(y,m,i+1).toISOString().split("T")[0]); };

const PROXY = "/api/search";

async function fetchDuffel(key,origin,dest,date,adults){
  const r=await fetch(PROXY,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({provider:"duffel",duffelKey:key,origin,dest,date,adults})
  });
  const d=await r.json();
  if(d.error) throw new Error("Duffel: "+d.error);
  if(d.errors) throw new Error("Duffel: "+d.errors[0]?.message);
  return (d.data?.offers||[]).slice(0,10).map(o=>({
    source:"Duffel",id:"df-"+o.id,
    price:parseFloat(o.total_amount),
    currency:o.total_currency,
    airline:o.owner?.name||o.owner?.iata_code||"—",
    stops:o.slices[0]?.segments?.length-1||0,
    duration:o.slices[0]?.duration||"—",
    dep:o.slices[0]?.segments[0]?.departing_at?.slice(11,16)||"—",
    arr:o.slices[0]?.segments.at(-1)?.arriving_at?.slice(11,16)||"—",
    seats:null,cabin:"ECONOMY",deeplink:null,
  }));
}

async function fetchSkyScrapper(key,origin,dest,date,adults){
  const r=await fetch(PROXY,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({provider:"skyscrapper",ssKey:key,origin,dest,date,adults})
  });
  const d=await r.json();
  if(d.error) throw new Error("SkyScrapper: "+d.error);
  return (d.data?.itineraries||[]).slice(0,10).map((it,i)=>{
    const leg=it.legs?.[0];
    return {source:"SkyScrapper",id:"ss-"+i,
      price:parseFloat(it.price?.raw||0),currency:"BRL",
      airline:leg?.carriers?.marketing?.[0]?.name||"—",
      stops:leg?.stopCount||0,
      duration:`${Math.floor((leg?.durationInMinutes||0)/60)}h ${(leg?.durationInMinutes||0)%60}min`,
      dep:leg?.departure?.slice(11,16)||"—",
      arr:leg?.arrival?.slice(11,16)||"—",
      seats:null,cabin:"ECONOMY",deeplink:null};
  });
}

const srcStyle={Duffel:"bg-violet-100 text-violet-700",SkyScrapper:"bg-teal-100 text-teal-700"};
const srcIcon={Duffel:"🟣",SkyScrapper:"🔭"};

function FlightCard({f,isLowest}){
  return(
    <div className={`bg-white rounded-2xl p-4 shadow border-2 ${isLowest?"border-green-400":"border-transparent"} relative`}>
      {isLowest&&<div className="absolute -top-3 left-4"><span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">🏷️ Menor preço global</span></div>}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-col items-center w-14">
          <span className="text-xl font-bold text-gray-800">{f.dep}</span>
          <span className="text-xs text-gray-400">partida</span>
        </div>
        <div className="flex-1 flex flex-col items-center text-xs text-gray-400">
          <span>{f.duration}</span>
          <div className="w-full flex items-center gap-1 my-1">
            <div className="flex-1 border-t border-dashed border-gray-300"/>
            {f.stops===0?<span className="text-green-500 font-semibold">Direto ✈️</span>:<span className="text-orange-400">{f.stops} parada{f.stops>1?"s":""}</span>}
            <div className="flex-1 border-t border-dashed border-gray-300"/>
          </div>
          <span className="font-semibold text-gray-600">{f.airline}</span>
        </div>
        <div className="flex flex-col items-center w-14">
          <span className="text-xl font-bold text-gray-800">{f.arr}</span>
          <span className="text-xs text-gray-400">chegada</span>
        </div>
        <div className="text-right min-w-[120px]">
          <div className="text-2xl font-extrabold text-blue-600">{fmtBRL(f.price)}</div>
          <div className="text-xs text-gray-400">por pessoa</div>
        </div>
      </div>
      <div className="mt-2 flex gap-2 flex-wrap">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${srcStyle[f.source]}`}>{srcIcon[f.source]} {f.source}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{f.cabin}</span>
        {f.seats&&<span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{f.seats} assentos</span>}
        {f.deeplink&&<a href={f.deeplink} target="_blank" rel="noreferrer" className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full underline">Reservar →</a>}
      </div>
    </div>
  );
}

function CalendarView({prices,year,month}){
  const days=getDays(year,month);
  const vals=Object.values(prices);
  const mn=vals.length?Math.min(...vals):0,mx=vals.length?Math.max(...vals):1;
  const col=p=>{if(!p)return"bg-gray-50 text-gray-200";const r=(p-mn)/(mx-mn+1);return r<0.33?"bg-green-100 text-green-800 font-bold":r<0.66?"bg-yellow-100 text-yellow-800":"bg-red-100 text-red-700";};
  const start=new Date(year,month,1).getDay();
  return(
    <div className="bg-white rounded-2xl p-4 shadow">
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-1">{["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d=><div key={d}>{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {Array(start).fill(null).map((_,i)=><div key={i}/>)}
        {days.map(date=>{
          const day=parseInt(date.split("-")[2]),p=prices[date];
          return(<div key={date} className={`rounded-lg p-1 text-center ${col(p)}`}>
            <div className="text-xs font-semibold">{day}</div>
            {p?<div className="text-[9px]">R${Math.round(p)}</div>:<div className="text-[9px] text-gray-200">—</div>}
          </div>);
        })}
      </div>
      <div className="mt-3 flex gap-3 text-xs justify-center">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block"/>Mais barato</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200 inline-block"/>Médio</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block"/>Mais caro</span>
      </div>
    </div>
  );
}

const TABS=[["search","🔍 Buscar"],["calendar","📅 Calendário"],["alerts","🔔 Alertas"],["config","⚙️ APIs"]];

export default function App(){
  const [tab,setTab]=useState("config");
  const [creds,setCreds]=useState({duffelKey:"",ssKey:""});
  const [origin,setOrigin]=useState("GRU");
  const [dest,setDest]=useState("LIS");
  const [date,setDate]=useState(()=>{const d=new Date();d.setDate(d.getDate()+30);return d.toISOString().split("T")[0];});
  const [adults,setAdults]=useState(1);
  const [results,setResults]=useState([]);
  const [statuses,setStatuses]=useState({});
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const now=new Date();
  const [calMonth,setCalMonth]=useState({year:now.getFullYear(),month:now.getMonth()});
  const [calPrices,setCalPrices]=useState({});
  const [calLoading,setCalLoading]=useState(false);
  const [alerts,setAlerts]=useState([]);
  const [aEmail,setAEmail]=useState("");
  const [aOrigin,setAOrigin]=useState("GRU");
  const [aDest,setADest]=useState("LIS");
  const [aPrice,setAPrice]=useState("");
  const [alertOk,setAlertOk]=useState(false);

  const enabledApis=()=>{
    const a=[];
    if(creds.duffelKey) a.push("Duffel");
    if(creds.ssKey) a.push("SkyScrapper");
    return a;
  };

  const doSearch=async()=>{
    setErr("");setResults([]);setStatuses({});setLoading(true);
    const apis=enabledApis();
    if(!apis.length){setErr("Configure ao menos uma API na aba ⚙️ APIs.");setLoading(false);return;}
    const st={};apis.forEach(a=>st[a]="⏳ buscando...");setStatuses({...st});
    const runners=[
      apis.includes("Duffel")&&fetchDuffel(creds.duffelKey,origin,dest,date,adults).then(r=>{setStatuses(p=>({...p,Duffel:`✅ ${r.length} voos`}));return r;}).catch(e=>{setStatuses(p=>({...p,Duffel:`❌ ${e.message}`}));return[];}),
      apis.includes("SkyScrapper")&&fetchSkyScrapper(creds.ssKey,origin,dest,date,adults).then(r=>{setStatuses(p=>({...p,SkyScrapper:`✅ ${r.length} voos`}));return r;}).catch(e=>{setStatuses(p=>({...p,SkyScrapper:`❌ ${e.message}`}));return[];}),
    ].filter(Boolean);
    const all=await Promise.all(runners);
    const flat=all.flat().sort((a,b)=>a.price-b.price);
    setResults(flat);
    if(!flat.length) setErr("Nenhum voo encontrado. Verifique as credenciais e a rota.");
    setLoading(false);
  };

  const doCalendar=async()=>{
    setErr("");setCalPrices({});setCalLoading(true);
    const apis=enabledApis();
    if(!apis.length){setErr("Configure ao menos uma API.");setCalLoading(false);return;}
    const dates=getDays(calMonth.year,calMonth.month).filter(d=>d>=today()).slice(0,12);
    const agg={};
    await Promise.all(dates.map(async d=>{
      const runners=[];
      if(apis.includes("SkyScrapper")) runners.push(fetchSkyScrapper(creds.ssKey,origin,dest,d,1).catch(()=>[]));
      const all=(await Promise.all(runners)).flat();
      if(all.length) agg[d]=Math.min(...all.map(f=>f.price));
    }));
    setCalPrices(agg);
    if(!Object.keys(agg).length) setErr("Sem dados de preço para este mês.");
    setCalLoading(false);
  };

  const addAlert=()=>{
    if(!aEmail||!aPrice){setErr("Preencha e-mail e preço máximo.");return;}
    setAlerts(p=>[...p,{email:aEmail,origin:aOrigin,dest:aDest,maxPrice:aPrice,id:Date.now()}]);
    setAlertOk(true);setErr("");setTimeout(()=>setAlertOk(false),3000);
  };

  const minPrice=results.length?Math.min(...results.map(f=>f.price)):null;
  const apis=enabledApis();

  return(
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-4 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-5">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">✈️ BuscaVoo Pro</h1>
          <p className="text-blue-300 text-sm mt-1">Agregador multi-API — 2 fontes simultâneas</p>
          {apis.length>0&&(
            <div className="flex justify-center gap-2 mt-2 flex-wrap">
              {apis.map(a=><span key={a} className={`text-xs font-bold px-2 py-0.5 rounded-full ${srcStyle[a]}`}>{srcIcon[a]} {a}</span>)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1 mb-4">
          {TABS.map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              className={`py-2 rounded-xl text-xs font-semibold transition ${tab===k?"bg-white text-blue-900":"bg-white/10 text-white hover:bg-white/20"}`}>
              {l}
            </button>
          ))}
        </div>

        {err&&<div className="bg-red-500/20 text-red-200 border border-red-500/30 rounded-xl p-3 mb-4 text-sm">{err}</div>}

        {tab==="config"&&(
          <div className="space-y-3">
            {[
              {label:"🟣 Duffel",desc:"app.duffel.com → Developers → Access tokens",fields:[{k:"duffelKey",ph:"Duffel Access Token"}]},
              {label:"🔭 SkyScrapper",desc:"rapidapi.com → sky-scrapper → X-RapidAPI-Key",fields:[{k:"ssKey",ph:"RapidAPI Key"}]},
            ].map(({label,desc,fields})=>(
              <div key={label} className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-white font-bold text-sm">{label}</span>
                  <span className="text-blue-300 text-xs text-right max-w-[180px]">{desc}</span>
                </div>
                {fields.map(({k,ph})=>(
                  <input key={k} type="password" placeholder={ph} value={creds[k]}
                    onChange={e=>setCreds(p=>({...p,[k]:e.target.value}))}
                    className="w-full rounded-lg p-2 mb-1 text-sm bg-white/20 text-white placeholder-blue-300 border border-white/20 outline-none"/>
                ))}
              </div>
            ))}
            <button onClick={()=>{setErr("");setTab("search");}}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 text-white font-bold py-3 rounded-xl transition text-lg">
              💾 Salvar e buscar →
            </button>
            <p className="text-blue-400/60 text-xs text-center">Configure apenas as APIs que tiver — as demais serão ignoradas.</p>
          </div>
        )}

        {tab==="search"&&(
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[["Origem",origin,setOrigin],["Destino",dest,setDest]].map(([lbl,val,set])=>(
                  <div key={lbl}>
                    <label className="text-blue-200 text-xs mb-1 block">{lbl}</label>
                    <select className="w-full rounded-lg p-2 text-sm bg-white/20 text-white border border-white/20 outline-none"
                      value={val} onChange={e=>set(e.target.value)}>
                      {airports.map(a=><option key={a.code} value={a.code} className="text-black">{a.code} – {a.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-blue-200 text-xs mb-1 block">Data de ida</label>
                  <input type="date" value={date} min={today()} onChange={e=>setDate(e.target.value)}
                    className="w-full rounded-lg p-2 text-sm bg-white/20 text-white border border-white/20 outline-none"/>
                </div>
                <div>
                  <label className="text-blue-200 text-xs mb-1 block">Passageiros</label>
                  <select value={adults} onChange={e=>setAdults(parseInt(e.target.value))}
                    className="w-full rounded-lg p-2 text-sm bg-white/20 text-white border border-white/20 outline-none">
                    {[1,2,3,4,5,6].map(n=><option key={n} value={n} className="text-black">{n} adulto{n>1?"s":""}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={doSearch} disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 text-lg">
                {loading?"🔄 Consultando todas as fontes...":"🚀 Buscar em todas as APIs"}
              </button>
            </div>
            {Object.keys(statuses).length>0&&(
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(statuses).map(([src,st])=>(
                  <div key={src} className={`rounded-xl px-3 py-2 text-xs font-semibold ${srcStyle[src]}`}>
                    {srcIcon[src]} <span className="font-bold">{src}</span><br/><span className="opacity-80">{st}</span>
                  </div>
                ))}
              </div>
            )}
            {results.length>0&&(
              <div className="space-y-3">
                <div className="text-white font-semibold">{results.length} voos — melhor: {fmtBRL(minPrice)}</div>
                {results.map(f=><FlightCard key={f.id} f={f} isLowest={f.price===minPrice}/>)}
              </div>
            )}
          </div>
        )}

        {tab==="calendar"&&(
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[["Origem",origin,setOrigin],["Destino",dest,setDest]].map(([lbl,val,set])=>(
                  <div key={lbl}>
                    <label className="text-blue-200 text-xs mb-1 block">{lbl}</label>
                    <select className="w-full rounded-lg p-2 text-sm bg-white/20 text-white border border-white/20 outline-none"
                      value={val} onChange={e=>set(e.target.value)}>
                      {airports.map(a=><option key={a.code} value={a.code} className="text-black">{a.code} – {a.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={()=>setCalMonth(p=>{const d=new Date(p.year,p.month-1);return{year:d.getFullYear(),month:d.getMonth()};})}
                  className="text-white bg-white/20 px-3 py-2 rounded-lg">‹</button>
                <div className="flex-1 text-center text-white font-semibold capitalize">
                  {new Date(calMonth.year,calMonth.month).toLocaleString("pt-BR",{month:"long",year:"numeric"})}
                </div>
                <button onClick={()=>setCalMonth(p=>{const d=new Date(p.year,p.month+1);return{year:d.getFullYear(),month:d.getMonth()};})}
                  className="text-white bg-white/20 px-3 py-2 rounded-lg">›</button>
              </div>
              <button onClick={doCalendar} disabled={calLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90 text-white font-bold py-3 rounded-xl transition disabled:opacity-50">
                {calLoading?"⏳ Carregando preços...":"📅 Ver melhor preço por dia"}
              </button>
            </div>
            {Object.keys(calPrices).length>0&&<CalendarView prices={calPrices} year={calMonth.year} month={calMonth.month}/>}
          </div>
        )}

        {tab==="alerts"&&(
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20 space-y-3">
              <h2 className="text-white font-bold">🔔 Criar alerta de preço</h2>
              <input type="email" placeholder="Seu e-mail" value={aEmail} onChange={e=>setAEmail(e.target.value)}
                className="w-full rounded-lg p-2 text-sm bg-white/20 text-white placeholder-blue-300 border border-white/20 outline-none"/>
              <div className="grid grid-cols-2 gap-3">
                {[["Origem",aOrigin,setAOrigin],["Destino",aDest,setADest]].map(([lbl,val,set])=>(
                  <div key={lbl}>
                    <label className="text-blue-200 text-xs mb-1 block">{lbl}</label>
                    <select className="w-full rounded-lg p-2 text-sm bg-white/20 text-white border border-white/20 outline-none"
                      value={val} onChange={e=>set(e.target.value)}>
                      {airports.map(a=><option key={a.code} value={a.code} className="text-black">{a.code}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-blue-200 text-xs mb-1 block">Preço máximo (R$)</label>
                <input type="number" placeholder="Ex: 2500" value={aPrice} onChange={e=>setAPrice(e.target.value)}
                  className="w-full rounded-lg p-2 text-sm bg-white/20 text-white placeholder-blue-300 border border-white/20 outline-none"/>
              </div>
              <button onClick={addAlert}
                className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:opacity-90 text-white font-bold py-3 rounded-xl transition">
                ➕ Criar alerta
              </button>
              {alertOk&&<div className="text-green-300 text-sm text-center">✅ Alerta criado!</div>}
              <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-3 text-yellow-200 text-xs">
                ⚠️ Para e-mails reais é necessário um backend com SendGrid/AWS SES. Alertas salvos apenas nesta sessão.
              </div>
            </div>
            {alerts.length>0&&(
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
                <h3 className="text-white font-bold mb-3">Alertas ativos ({alerts.length})</h3>
                <div className="space-y-2">
                  {alerts.map(a=>(
                    <div key={a.id} className="flex justify-between items-center bg-white/10 rounded-xl px-3 py-2">
                      <div className="text-sm text-white">
                        <span className="font-bold">{a.origin} → {a.dest}</span>
                        <span className="text-blue-200 ml-2">abaixo de R$ {a.maxPrice}</span>
                        <div className="text-xs text-blue-300">{a.email}</div>
                      </div>
                      <button onClick={()=>setAlerts(p=>p.filter(x=>x.id!==a.id))} className="text-red-300 hover:text-red-200">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-blue-400/40 text-xs mt-6">Duffel · SkyScrapper</p>
      </div>
    </div>
  );
}
