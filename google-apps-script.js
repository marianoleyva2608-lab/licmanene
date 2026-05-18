// ================================================
// GOOGLE APPS SCRIPT - Lic Manene
// El correo se envía siempre. Google Meet se agrega
// si tienes habilitado el servicio "Google Calendar API"
// en Servicios (+ Agregar servicio). Si no, igual funciona.
// ================================================

function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const data = JSON.parse(e.postData.contents);
    const inicio = new Date(data.fecha);
    const fin = new Date(inicio.getTime() + 50 * 60 * 1000);

    // Bloqueo manual sin datos de cliente
    if (data.cliente === 'BLOQUEO MANUAL') {
      const cal = CalendarApp.getDefaultCalendar();
      const ev = cal.createEvent('🚫 BLOQUEADO', inicio, fin, {
        description: 'Horario bloqueado manualmente.'
      });
      output.setContent(JSON.stringify({ success: true, eventId: ev.getId() }));
      return output;
    }

    const titulo = `⚖️ Asesoría: ${data.cliente}`;
    let meetLink = '';
    let eventId = '';

    // Intentar crear con Google Meet (requiere servicio Calendar API avanzada)
    try {
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
      eventId = createdEvent.id || '';

      // Buscar el link de Meet en hangoutLink o en conferenceData.entryPoints
      meetLink = createdEvent.hangoutLink || '';
      if (!meetLink && createdEvent.conferenceData && createdEvent.conferenceData.entryPoints) {
        const videoEntry = createdEvent.conferenceData.entryPoints.find(function(ep) {
          return ep.entryPointType === 'video';
        });
        if (videoEntry) meetLink = videoEntry.uri || '';
      }
    } catch (meetErr) {
      // Fallback: crear evento normal sin Meet
      const cal = CalendarApp.getDefaultCalendar();
      const ev = cal.createEvent(titulo, inicio, fin, {
        description: `Cliente: ${data.cliente}\nContacto: ${data.contacto}\nPago ID: ${data.pagoId}`
      });
      eventId = ev.getId();
    }

    // Enviar correo si hay dirección de email
    if (data.correo) {
      const fechaFormato = inicio.toLocaleString('es-MX', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City'
      });

      const meetSection = meetLink
        ? `<div style="margin:15px 0;padding:15px;background:#0f2a0f;border-left:4px solid #34d399;border-radius:6px;">
            <p style="margin:0 0 8px 0;font-weight:bold;color:#34d399;">💻 Link de Google Meet:</p>
            <a href="${meetLink}" style="color:#d4af37;font-size:1.05rem;word-break:break-all;">${meetLink}</a>
           </div>`
        : `<p style="color:#aaa;">El link de videollamada será enviado por WhatsApp antes de la cita.</p>`;

      GmailApp.sendEmail(
        data.correo,
        '✅ Confirmación de Asesoría - Lic. Manene',
        `Tu asesoría del ${fechaFormato} ha sido confirmada. Duración: 50 minutos.${meetLink ? ' Link Meet: ' + meetLink : ''}`,
        {
          htmlBody: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0c0b0a;color:#f8f8f8;padding:30px;border-radius:12px;">
              <h2 style="color:#d4af37;margin-top:0;">⚖️ Tu Asesoría está Confirmada</h2>
              <p>Hola <strong>${data.cliente}</strong>,</p>
              <p>Tu asesoría legal ha sido agendada exitosamente.</p>
              <div style="background:#1a1a1a;border:1px solid #d4af37;border-radius:8px;padding:20px;margin:20px 0;">
                <p style="margin:0 0 10px 0;"><strong>📅 Fecha:</strong> ${fechaFormato}</p>
                <p style="margin:0 0 10px 0;"><strong>⏱️ Duración:</strong> 50 minutos</p>
                ${meetSection}
              </div>
              <p>Únete a la videollamada en el horario agendado haciendo clic en el enlace de arriba.</p>
              <p style="color:#aaa;font-size:0.85rem;">Si tienes alguna pregunta, contáctanos por WhatsApp.</p>
              <hr style="border:none;border-top:1px solid #333;margin:20px 0;">
              <p style="color:#d4af37;font-weight:bold;margin:0;">Lic. Manene Díaz</p>
              <p style="color:#888;font-size:0.8rem;margin:4px 0 0 0;">Asesoría Legal Profesional</p>
            </div>
          `
        }
      );
    }

    output.setContent(JSON.stringify({ success: true, eventId: eventId, meetLink: meetLink }));
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

// Función de prueba — ejecútala manualmente desde Apps Script para verificar el correo
function testEnviarCorreo() {
  const payload = {
    postData: {
      contents: JSON.stringify({
        cliente: 'Prueba Test',
        contacto: '5512345678',
        correo: Session.getActiveUser().getEmail(),
        fecha: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        pagoId: 'TEST_MANUAL_' + Date.now()
      })
    }
  };
  const result = doPost(payload);
  Logger.log(result.getContent());
}
