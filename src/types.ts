export interface Plant {id:number;name:string;type:string;variety?:string;nickname?:string;location?:string;notes?:string;planted?:string;sun?:string;setting?:string;water?:string;soil?:string;photo?:string;emoji?:string;status?:string;art?:string}
export interface Task {id:number;title:string;desc:string;plant:string;priority:string;done?:boolean;completedAt?:string|null}
export interface Entry {emoji?:string;plant:string;text:string;date:string}
export interface Garden {plants:Plant[];tasks:Task[];journal:Entry[]}
export const emptyGarden=():Garden=>({plants:[],tasks:[],journal:[]});
export const categories=['Fruit','Berry','Flower','Vegetable','Herb','Houseplant','Other'];
export const emoji:Record<string,string>={Fruit:'🍎',Berry:'🫐',Flower:'🌸',Vegetable:'🥕',Herb:'🌿',Houseplant:'🪴',Other:'🌱'};
export const groupKey=(p:Plant)=>p.name.trim().toLowerCase()+'::'+(p.variety||'').trim().toLowerCase();
export const taskDate=(t:Task)=>t.completedAt?new Date(t.completedAt).toLocaleString():'Completion date not recorded';
