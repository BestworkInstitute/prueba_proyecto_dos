const express = require('express');
const axios = require('axios');
const { google } = require('googleapis');

const app = express();

// Configuración de Google Sheets API
const sheets = google.sheets('v4');
const SHEET_ID = '1vfpez0cdPmo7PTvWtV6QK61lZqZ8cR6CV0GeAdEn98k';  // Cambia por el ID de tu Google Sheet
const RANGE = 'BBDD!A:C';  // Rango de celdas: Columna A (RUT), Columna B (Link Taller), Columna C (Nombre Completo Correcto)

// Función para buscar el nombre y el link del taller en Google Sheets
async function getTallerInfo(rut) {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const client = await auth.getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,  // ID de tu Google Sheet
    range: RANGE,  // Rango de las columnas A (RUT), B (Link), C (Nombre Completo)
    auth: client,
  });

  const rows = res.data.values;
  const result = rows.find(row => row[0] === rut);  // Buscar el RUT en la primera columna
  
  if (result) {
    return {
      linkTaller: result[1],  // Columna B es el Link Taller
      nombre: result[2]  // Columna C es el Nombre Completo Correcto
    };
  } else {
    throw new Error('Información no encontrada para el RUT proporcionado');
  }
}

// Función para enviar el mensaje a MessageBird
async function agregarContactoAFlow(NOMBRE, CELULAR, AREA, MENSAJE, flow) {
  const url = `https://flows.messagebird.com/flows/${flow}/invoke`;  // URL del flujo de MessageBird
  const headers = {
    'NOMBRE': NOMBRE,
    'CELULAR': CELULAR,
    'AREA': AREA,
    'MENSAJE': MENSAJE
  };

  const response = await axios.post(url, {}, { headers });  // Enviar el POST a MessageBird
  return response.data;
}

// Endpoint para recibir el RUT y CELULAR desde la URL
app.get('/api/get-link/:celular/:rut', async (req, res) => {
  const { celular, rut } = req.params;  // Capturar los parámetros de la URL (celular y RUT)

  try {
    const { linkTaller, nombre } = await getTallerInfo(rut);  // Obtener el nombre y link del taller desde Google Sheets
    const flow = "bb848b58-c891-4aec-ac21-738a857bc778";  // Nuevo flow de MessageBird
    const area = "OTROS";  // Área fija como OTROS
    const mensaje = `SU LINK ES ${linkTaller}`;  // Crear el mensaje con el link del taller

    // Enviar el mensaje a MessageBird
    const messageResponse = await agregarContactoAFlow(nombre, celular, area, mensaje, flow);
    
    res.json({ success: true, message: "Mensaje enviado", data: messageResponse });  // Respuesta exitosa
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });  // Manejo de errores
  }
});

module.exports = app;  // Exporta la aplicación para que Vercel pueda usarla
