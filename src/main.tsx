import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import * as supabase from '@supabase/supabase-js';
import layout from './legacy-layout.html?raw';
import './styles.css';

// Transitional adapter: retain the tested interface while extracting features into React.
function App(){
 const host=useRef<HTMLDivElement>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(!host.current)return;
  host.current.innerHTML=layout;
  Object.assign(window,{supabase});
  const runtime=document.createElement('script');
  runtime.src=import.meta.env.BASE_URL+'legacy-runtime.js';
  runtime.onerror=()=>setError('GardenWise could not start. Please refresh.');
  document.body.appendChild(runtime);
  return ()=>runtime.remove();
 },[]);
 return <><div ref={host}/>{error&&<p role="alert">{error}</p>}</>;
}
createRoot(document.getElementById('root')!).render(<App/>);
