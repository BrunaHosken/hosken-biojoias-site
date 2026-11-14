import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
export type Taxonomy = {id:string;name:string;slug:string;status:string};
export type Product = {id:string;name:string;description:string;priceCents:number;stock:number;categoryId:string;collectionId:string;status:string;availability:string;imageUrl:string};
export type Content = {id:string;title:string;body:string;status:string};
export function useRecords<T>(name:string, all=false) {
  const [data,setData]=useState<T[]>([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    setData([]);setLoading(true);setError('');
    const timer=setTimeout(()=>setError('Leitura demorando. Confira se os emuladores estão rodando e execute npm run db:seed.'),8000);
    const ref=collection(db,name);
    const unsub=onSnapshot(all?ref:query(ref,where('status','==','published')),snapshot=>{
      clearTimeout(timer);setData(snapshot.docs.map(d=>({id:d.id,...d.data()}) as T));setError('');setLoading(false);
    },()=>{clearTimeout(timer);setError('Não foi possível acessar os dados. Confira sua conexão e as permissões.');setLoading(false);});
    return ()=>{clearTimeout(timer);unsub();};
  },[name,all]);
  return {data,error,loading};
}
export const money=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
