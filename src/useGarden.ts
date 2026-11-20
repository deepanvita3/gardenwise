import {useEffect,useState,useRef} from 'react';
import type {User} from '@supabase/supabase-js';
import {client} from './client';
import {emptyGarden} from './types';
import type {Garden} from './types';
export function useGarden(){
 const [user,setUser]=useState<User|null>(null),[garden,setGarden]=useState<Garden>(emptyGarden),[ready,setReady]=useState(false),[loading,setLoading]=useState(true),[status,setStatus]=useState('');
 const generation=useRef(0),saved=useRef(''),queue=useRef<Promise<void>>(Promise.resolve()),active=useRef<string|null>(null);
 useEffect(()=>{let stopped=false;async function load(u:User|null){if(stopped||active.current===u?.id&&u)return;const g=++generation.current;active.current=u?.id||null;setUser(u);setReady(false);setGarden(emptyGarden());setLoading(!!u);if(!u){setLoading(false);return}const {data,error}=await client.from('garden_state').select('plants,tasks,journal').eq('user_id',u.id).maybeSingle();if(stopped||g!==generation.current)return;if(error){setStatus('Load failed: '+error.message);setLoading(false);return}const next:Garden={plants:data?.plants||[],tasks:data?.tasks||[],journal:data?.journal||[]};saved.current=JSON.stringify(next);setGarden(next);setReady(true);setLoading(false);setStatus('Saved')}
 const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{if(event==='INITIAL_SESSION'||event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(()=>void load(session?.user||null),0)});
 return ()=>{stopped=true;subscription.unsubscribe()}
 },[]);
 function queueSave(snapshot:string,id:string,g:number){
  queue.current=queue.current.then(async()=>{
   if(generation.current!==g||snapshot===saved.current)return;
   setStatus('Saving…');
   const {error}=await client.from('garden_state').upsert({user_id:id,...JSON.parse(snapshot),updated_at:new Date().toISOString()},{onConflict:'user_id'});
   if(generation.current!==g)return;
   if(error)throw error;
   saved.current=snapshot;
   setStatus('Saved');
  }).catch(error=>{if(generation.current===g)setStatus('Save failed: '+error.message)});
  return queue.current;
 }
 useEffect(()=>{
  if(!ready||!user)return;
  const snapshot=JSON.stringify(garden);
  void queueSave(snapshot,user.id,generation.current);
  function warn(event:BeforeUnloadEvent){
   if(snapshot!==saved.current){event.preventDefault();event.returnValue=''}
  }
  window.addEventListener('beforeunload',warn);
  return ()=>window.removeEventListener('beforeunload',warn);
 },[garden,ready,user]);
 const [signingOut,setSigningOut]=useState(false);
 async function signOut(){
  setSigningOut(true);
  try{
   const snapshot=JSON.stringify(garden);
   if(ready&&user){
    await queue.current;
    if(snapshot!==saved.current)await queueSave(snapshot,user.id,generation.current);
    if(snapshot!==saved.current)return;
   }
   const {error}=await client.auth.signOut();
   if(error)setStatus(error.message);
  }finally{setSigningOut(false)}
 }
 return {user,garden,setGarden,ready,loading,status,signingOut,signOut};
}
