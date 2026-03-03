import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function mock() {
  const cedula = '9999999999';

  // Find last Saturday
  const dSalida = new Date();
  dSalida.setDate(dSalida.getDate() - dSalida.getDay() - 1);
  dSalida.setHours(14, 0, 0);

  await supabase.from('parking_logs').insert({
    cedula,
    tipo_movimiento: '2', // Salida
    token_type: 'standard',
    placa: 'ABC-999',
    kilometraje: 150000,
    conductor_institucional: 'Mario Bros',
    fecha_hora: dSalida.toISOString()
  });

  // Last Sunday (75 km trip)
  const dEntrada = new Date(dSalida);
  dEntrada.setDate(dEntrada.getDate() + 1);
  dEntrada.setHours(20, 0, 0);

  await supabase.from('parking_logs').insert({
    cedula,
    tipo_movimiento: '1', // Entrada
    token_type: 'standard',
    placa: 'ABC-999',
    kilometraje: 150075.5,
    conductor_institucional: 'Mario Bros',
    fecha_hora: dEntrada.toISOString()
  });

  console.log("Mock data inserted successfully!");
}
mock();
