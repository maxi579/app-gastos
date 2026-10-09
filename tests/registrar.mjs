// Permite correr los tests de src/lib con Node sin herramientas extra:
// Node ya entiende TypeScript, solo le enseñamos a resolver imports sin extensión ('./finanzas' → './finanzas.ts').
import { register } from 'node:module';

register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(especificador, contexto, siguiente) {
        try {
          return await siguiente(especificador, contexto);
        } catch (error) {
          if (especificador.startsWith('.')) return siguiente(especificador + '.ts', contexto);
          throw error;
        }
      }
    `)
);
