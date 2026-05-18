// ================================================
// GOOGLE APPS SCRIPT - Lic Manene
// Pega este código en script.google.com
// ================================================

const CLIENT_ID = "632910100889-1qqj82379872220tt8sqs9e9ioj49snc.apps.googleusercontent.com";

function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const data = JSON.parse(e.postData.contents);
    const calendar = CalendarApp.getDefaultCalendar();
    const inicio = new Date(data.fecha);
    const fin = new Date(inicio.getTime() + 50 * 60 * 1000); // 50 minutos

    let titulo, descripcion;

    if (data.cliente === 'BLOQUEO MANUAL') {
      titulo = '🚫 BLOQUEADO';
      descripcion = 'Horario bloqueado manualmente desde el panel de administración.';
    } else {
      titulo = `⚖️ Asesoría: ${data.cliente}`;
      descripcion = `Cliente: ${data.cliente}\nContacto: ${data.contacto}\nPago ID: ${data.pagoId}`;
    }

    const evento = calendar.createEvent(titulo, inicio, fin, {
      description: descripcion,
      sendInvites: false
    });

    output.setContent(JSON.stringify({ success: true, eventId: evento.getId() }));
  } catch (err) {
    output.setContent(JSON.stringify({ success: false, error: err.toString() }));
  }

  return output;
}

function doGet(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const calendar = CalendarApp.getDefaultCalendar();
    const ahora = new Date();
    const enUnMes = new Date(ahora.getTime() + 60 * 24 * 60 * 60 * 1000);

    const eventos = calendar.getEvents(ahora, enUnMes).map(ev => ({
      id: ev.getId(),
      title: ev.getTitle(),
      start: ev.getStartTime().toISOString(),
      end: ev.getEndTime().toISOString(),
      backgroundColor: ev.getTitle().includes('BLOQUEADO') ? '#4b4b4b' : '#d4af37',
      borderColor: 'transparent',
      textColor: '#000'
    }));

    output.setContent(JSON.stringify(eventos));
  } catch (err) {
    output.setContent(JSON.stringify({ error: err.toString() }));
  }

  return output;
}
