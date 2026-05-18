// ================================================
// GOOGLE APPS SCRIPT - Lic Manene
// IMPORTANTE: Antes de desplegar, habilita el servicio
// "Google Calendar API" en Servicios (+ Agregar servicio)
// ================================================

function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const data = JSON.parse(e.postData.contents);
    const inicio = new Date(data.fecha);
    const fin = new Date(inicio.getTime() + 50 * 60 * 1000);

    // Bloqueo sin datos de cliente
    if (data.cliente === 'BLOQUEO MANUAL') {
      const calendar = CalendarApp.getDefaultCalendar();
      const evento = calendar.createEvent('🚫 BLOQUEADO', inicio, fin, {
        description: 'Horario bloqueado manualmente.'
      });
      output.setContent(JSON.stringify({ success: true, eventId: evento.getId() }));
      return output;
    }

    // Crear evento con Google Meet usando Calendar API avanzada
    const titulo = `⚖️ Asesoría: ${data.cliente}`;
    const event = {
      summary: titulo,
      description: `Cliente: ${data.cliente}\nContacto: ${data.contacto}\nPago ID: ${data.pagoId}`,
      start: { dateTime: inicio.toISOString(), timeZone: 'America/Mexico_City' },
      end:   { dateTime: fin.toISOString(),    timeZone: 'America/Mexico_City' },
      conferenceData: {
        createRequest: {
          requestId: 'meet-' + Date.now(),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    const createdEvent = Calendar.Events.insert(event, 'primary', { conferenceDataVersion: 1 });
    const meetLink = createdEvent.hangoutLink || '';

    // Enviar correo si hay dirección de email
    if (data.correo && meetLink) {
      const fechaFormato = inicio.toLocaleString('es-MX', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City'
      });

      GmailApp.sendEmail(
        data.correo,
        '✅ Confirmación de Asesoría - Lic. Manene',
        '',
        {
          htmlBody: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0c0b0a;color:#f8f8f8;padding:30px;border-radius:12px;">
              <h2 style="color:#d4af37;">⚖️ Tu Asesoría está Confirmada</h2>
              <p>Hola <strong>${data.cliente}</strong>,</p>
              <p>Tu asesoría legal ha sido agendada exitosamente.</p>
              <div style="background:#1a1a1a;border:1px solid #d4af37;border-radius:8px;padding:20px;margin:20px 0;">
                <p><strong>📅 Fecha:</strong> ${fechaFormato}</p>
                <p><strong>⏱️ Duración:</strong> 50 minutos</p>
                <p><strong>💻 Google Meet:</strong><br>
                  <a href="${meetLink}" style="color:#d4af37;font-size:1.1rem;">${meetLink}</a>
                </p>
              </div>
              <p>Únete a la videollamada en el horario agendado haciendo clic en el enlace.</p>
              <p style="color:#aaa;font-size:0.85rem;">Si tienes alguna pregunta, contáctanos por WhatsApp.</p>
              <p style="color:#d4af37;font-weight:bold;">Lic. Manene Díaz</p>
            </div>
          `
        }
      );
    }

    output.setContent(JSON.stringify({ success: true, eventId: createdEvent.id, meetLink: meetLink }));
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
