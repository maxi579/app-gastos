import { createContext, useContext, type ReactNode } from 'react';
import { fuenteSupabase, type FuenteDatos } from './datos';

const ContextoDatos = createContext<FuenteDatos>(fuenteSupabase);

// Cualquier pantalla hace: const datos = useDatos(); await datos.gastos();
export function useDatos() {
  return useContext(ContextoDatos);
}

export function ProveedorDatos({ fuente, children }: { fuente: FuenteDatos; children: ReactNode }) {
  return <ContextoDatos.Provider value={fuente}>{children}</ContextoDatos.Provider>;
}
