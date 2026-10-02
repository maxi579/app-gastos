import { useEffect, useState } from 'react';
import Proximamente from '../components/Proximamente';
import { supabase } from '../lib/supabase';

export default function Inicio() {
  const [estado, setEstado] = useState('Conectando con Supabase...');

  useEffect(() => {
    supabase.from('gastos').select('id').then(({ error }) => {
      setEstado(error ? `Error: ${error.message}` : 'Conectado a Supabase ✓');
    });
  }, []);

  return <Proximamente titulo="Inicio" descripcion={estado} />;
}