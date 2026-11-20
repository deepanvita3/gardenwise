import {useEffect,useRef,useState} from 'react';
import type {Plant} from './types';

interface Place {name:string;admin1?:string;country?:string;country_code?:string;latitude:number;longitude:number}
interface Day {date:string;high?:number;low?:number;rain?:number;chance?:number}
interface Forecast {location:string;temp?:number;days:Day[];source:string}
interface Period {startTime:string;isDaytime:boolean;temperature:number;temperatureUnit:string;probabilityOfPrecipitation?:{value:number|null}}

const localPlaces:Record<string,Place>={
 Lynnwood:{name:'Lynnwood',admin1:'Washington',latitude:47.8209,longitude:-122.3151},
 Seattle:{name:'Seattle',admin1:'Washington',latitude:47.6062,longitude:-122.3321},
 Everett:{name:'Everett',admin1:'Washington',latitude:47.9790,longitude:-122.2021},
};
const number=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:undefined;

async function fetchWeather(url:string){
 const response=await fetch(url,{signal:AbortSignal.timeout(6500)});
 if(!response.ok)throw Error('Weather service unavailable');
 return response.json();
}

async function findPlace(city:string):Promise<Place>{
 const [name,region]=city.split(',').map(part=>part.trim());
 if(!name)throw Error('Enter a city to load the forecast.');
 const regionName=region?.toLowerCase();
 const local=Object.values(localPlaces).find(place=>place.name.toLowerCase()===name.toLowerCase());
 if(local&&(!regionName||regionName==='wa'||regionName==='washington'))return local;
 const query=new URLSearchParams({name,count:'10',language:'en'});
 const data=await fetchWeather('https://geocoding-api.open-meteo.com/v1/search?'+query);
 const options:Place[]=data.results||[];
 const match=regionName==='wa'?'washington':regionName;
 const place=match?options.find(p=>[p.admin1,p.country,p.country_code].some(value=>value?.toLowerCase()===match)):options[0];
 if(!place)throw Error('City not found. Try entering the full state or country name.');
 return place;
}

async function openMeteo(place:Place):Promise<Omit<Forecast,'location'>>{
 const query=new URLSearchParams({
  latitude:String(place.latitude),longitude:String(place.longitude),current:'temperature_2m',
  daily:'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
  temperature_unit:'fahrenheit',precipitation_unit:'inch',timezone:'auto',forecast_days:'7',
 });
 const data=await fetchWeather('https://api.open-meteo.com/v1/forecast?'+query);
 const days:Day[]=data.daily?.time?.slice(0,6).map((date:string,i:number)=>({
  date,high:number(data.daily.temperature_2m_max?.[i]),low:number(data.daily.temperature_2m_min?.[i]),
  rain:number(data.daily.precipitation_sum?.[i]),chance:number(data.daily.precipitation_probability_max?.[i]),
 }))??[];
 if(!days.some(day=>day.high!==undefined||day.low!==undefined))throw Error('Forecast unavailable');
 return {temp:number(data.current?.temperature_2m),days,source:'Open-Meteo'};
}

async function nationalWeatherService(place:Place):Promise<Omit<Forecast,'location'>>{
 const point=await fetchWeather('https://api.weather.gov/points/'+place.latitude.toFixed(4)+','+place.longitude.toFixed(4));
 const url=point.properties?.forecast;
 if(typeof url!=='string'||!url.startsWith('https://api.weather.gov/'))throw Error('Forecast unavailable');
 const data=await fetchWeather(url);
 const daily=new Map<string,Day>();
 for(const period of (data.properties?.periods??[]) as Period[]){
  const date=period.startTime.slice(0,10);
  const day=daily.get(date)??{date};
  if(Number.isFinite(period.temperature)){
   const temp=period.temperatureUnit==='C'?period.temperature*9/5+32:period.temperature;
   if(period.isDaytime)day.high=temp;else day.low=temp;
  }
  const chance=number(period.probabilityOfPrecipitation?.value);
  if(chance!==undefined)day.chance=Math.max(day.chance??0,chance);
  daily.set(date,day);
 }
 const days=[...daily.values()].slice(0,6);
 if(!days.some(day=>day.high!==undefined||day.low!==undefined))throw Error('Forecast unavailable');
 return {days,source:'National Weather Service'};
}

export function Weather({plants}:{plants:Plant[]}){
 const [city,setCity]=useState('Lynnwood, WA');
 const [forecast,setForecast]=useState<Forecast|null>(null);
 const [status,setStatus]=useState('');
 const requestId=useRef(0);
 async function load(){
  const request=++requestId.current;
  setForecast(null);
  setStatus('Checking live forecast…');
  try{
   const place=await findPlace(city);
   const location=[place.name,place.admin1].filter(Boolean).join(', ');
   const primary=openMeteo(place);
   const us=place.country_code==='US'||place.admin1==='Washington';
   const result=await (us?Promise.any([primary,nationalWeatherService(place)]):primary);
   if(request!==requestId.current)return;
   setForecast({...result,location});
   setStatus('Live forecast · '+result.source);
  }catch(error){
   if(request!==requestId.current)return;
   setStatus(error instanceof AggregateError?'Live forecast unavailable. Try again shortly.':error instanceof Error?error.message:'Live forecast unavailable');
  }
 }
 useEffect(()=>{void load();return ()=>{requestId.current++}},[]);
 const nearTerm=forecast?.days.slice(0,2)??[];
 const rain=nearTerm.reduce((sum,day)=>sum+(day.rain??0),0);
 const rainLikely=nearTerm.some(day=>(day.chance??0)>=65);
 const frost=forecast?.days.slice(0,3).some(day=>day.low!==undefined&&day.low<=32);
 const degrees=(temp?:number)=>temp===undefined?'—':Math.round(temp)+'°';
 return <><div className="weather-box">
  {forecast?.temp!==undefined&&<div className="weather-temp">{Math.round(forecast.temp)} °F</div>}
  <div className="weather-meta">{forecast?.location}</div>
  <form className="weather-controls" onSubmit={e=>{e.preventDefault();void load()}}>
   <input aria-label="City" value={city} onChange={e=>setCity(e.target.value)} required/>
   <button className="small-btn">Update</button>
  </form>
  <p role="status">{status}</p>
  <div className="forecast-days">{forecast?.days.map(day=><div className="forecast-day" key={day.date}>
   <strong>{new Date(day.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short'})}</strong>
   {degrees(day.high)} / {degrees(day.low)}
   {day.rain!==undefined&&<div>🌧 {day.rain.toFixed(2)}″</div>}
   {day.chance!==undefined&&<div>{day.chance}% chance</div>}
  </div>)}</div>
 </div><h3>💧 Watering recommendations</h3>{plants.map(plant=>{
  const sheltered=plant.type==='Houseplant'||/indoor|container|pot|patio/i.test((plant.setting||'')+' '+(plant.location||''));
  const advice=sheltered?'Check potting mix; outdoor rain may not reach this plant.':
   rain>=.2?'Rain forecast. Likely skip watering if root zone is moist.':
   rainLikely?'Rain is likely. Check soil moisture before watering.':'Check soil at root depth before watering.';
  return <div className="water-row" key={plant.id}><b>{plant.nickname||plant.name}</b><p>{advice}</p>
   {frost&&!sheltered&&<p>Freezing temperatures possible; check frost-sensitive plants.</p>}
  </div>;
 })}</>;
}
