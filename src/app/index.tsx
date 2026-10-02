import { useEffect, useState } from 'react';
import Proximamente from '../components/Proximamente';
import { supabase } from '../lib/supabase';

export default function Inicio() {
  const [saludo, setSaludo] = useState('Cargando...');

  useEffect(() => {
    supabase.from('perfiles').select('nombre').single().then(({ data, error }) => {
      setSaludo(error ? `Error: ${error.message}` : `Hola, ${data.nombre ?? 'che'} 👋`);
    });
  }, []);

  return <Proximamente titulo={saludo} descripcion="Acá vas a ver cuánto te queda disponible este mes." />;
}